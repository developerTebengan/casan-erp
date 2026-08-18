import { db } from '$lib/server/db';
import { catalogTotal, varianceRefund } from '$lib/petty-cash/variance';
import type { PettyCashSummary, PettyCashTransaction, PettyCashType } from '$lib/types';

const ACCOUNT_ID = 'default';

function money(value: unknown): number {
	return Math.round(Number(value) || 0);
}

function mapTx(row: {
	id: string;
	type: string;
	amount: unknown;
	balanceAfter: unknown;
	expectedAmount: unknown;
	paidAmount: unknown;
	catalogUnitPrice: unknown;
	actualUnitPrice: unknown;
	qty: number | null;
	productId: string | null;
	product?: { id: string; code: string; name: string } | null;
	stockTransactionId: string | null;
	note: string | null;
	createdBy: string | null;
	createdAt: Date;
}): PettyCashTransaction {
	return {
		id: row.id,
		type: row.type as PettyCashType,
		amount: money(row.amount),
		balanceAfter: money(row.balanceAfter),
		expectedAmount: row.expectedAmount == null ? null : money(row.expectedAmount),
		paidAmount: row.paidAmount == null ? null : money(row.paidAmount),
		catalogUnitPrice: row.catalogUnitPrice == null ? null : money(row.catalogUnitPrice),
		actualUnitPrice: row.actualUnitPrice == null ? null : money(row.actualUnitPrice),
		qty: row.qty,
		productId: row.productId,
		product: row.product ?? null,
		stockTransactionId: row.stockTransactionId,
		note: row.note,
		createdBy: row.createdBy,
		createdAt: row.createdAt.toISOString()
	};
}

const txInclude = { product: { select: { id: true, code: true, name: true } } };

export function pettyCashService() {
	async function ensureAccount() {
		return db.pettyCashAccount.upsert({
			where: { id: ACCOUNT_ID },
			create: { id: ACCOUNT_ID, balance: 0 },
			update: {}
		});
	}

	async function getBalance() {
		const account = await ensureAccount();
		return money(account.balance);
	}

	async function list(filters: {
		type?: PettyCashType;
		page?: number;
		limit?: number;
		from?: string;
		to?: string;
	} = {}): Promise<PettyCashSummary> {
		const { type, page = 1, limit = 20, from, to } = filters;
		const where: Record<string, unknown> = {};
		if (type) where.type = type;
		if (from || to) {
			const createdAt: Record<string, Date> = {};
			if (from) createdAt.gte = new Date(from);
			if (to) {
				const end = new Date(to);
				end.setHours(23, 59, 59, 999);
				createdAt.lte = end;
			}
			where.createdAt = createdAt;
		}
		const skip = (page - 1) * limit;
		const [rows, total, balance] = await Promise.all([
			db.pettyCashTransaction.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: txInclude
			}),
			db.pettyCashTransaction.count({ where }),
			getBalance()
		]);
		return {
			balance,
			transactions: rows.map(mapTx),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
		};
	}

	async function listForExport(filters: { type?: PettyCashType; from?: string; to?: string } = {}) {
		const result = await list({ ...filters, page: 1, limit: 5000 });
		return result.transactions;
	}

	async function topUp(input: { amount: unknown; note?: unknown }, createdBy?: string | null) {
		const amount = money(input.amount);
		if (amount <= 0) {
			return { success: false as const, errors: { amount: ['Amount must be greater than 0'] } };
		}
		const note = input.note ? String(input.note) : null;

		const result = await db.$transaction(async (tx) => {
			const account = await tx.pettyCashAccount.upsert({
				where: { id: ACCOUNT_ID },
				create: { id: ACCOUNT_ID, balance: 0 },
				update: {}
			});
			const next = money(account.balance) + amount;
			await tx.pettyCashAccount.update({
				where: { id: ACCOUNT_ID },
				data: { balance: next }
			});
			return tx.pettyCashTransaction.create({
				data: {
					type: 'TOP_UP',
					amount,
					balanceAfter: next,
					note,
					createdBy
				},
				include: txInclude
			});
		});

		return { success: true as const, data: mapTx(result) };
	}

	async function buyStock(
		input: {
			productId?: unknown;
			qty?: unknown;
			paidAmount?: unknown;
			actualUnitPrice?: unknown;
			updateCatalogPrice?: unknown;
			note?: unknown;
		},
		createdBy?: string | null
	) {
		const productId = String(input.productId ?? '');
		const qty = Number(input.qty);
		const paidAmount = money(input.paidAmount);
		const actualUnitPrice =
			input.actualUnitPrice === '' || input.actualUnitPrice == null
				? null
				: money(input.actualUnitPrice);
		const updateCatalog = Boolean(input.updateCatalogPrice);
		const note = input.note ? String(input.note) : null;

		if (!productId) {
			return { success: false as const, errors: { productId: ['Product is required'] } };
		}
		if (!Number.isFinite(qty) || qty <= 0) {
			return { success: false as const, errors: { qty: ['Quantity must be greater than 0'] } };
		}
		if (paidAmount < 0) {
			return { success: false as const, errors: { paidAmount: ['Amount paid cannot be negative'] } };
		}

		try {
			const result = await db.$transaction(async (tx) => {
				const product = await tx.product.findFirst({
					where: { id: productId, deletedAt: null }
				});
				if (!product) throw new Error('PRODUCT_NOT_FOUND');

				const catalogUnitPrice = money(product.price);
				const expectedAmount = catalogTotal(catalogUnitPrice, qty);
				const refundAmount = varianceRefund(expectedAmount, paidAmount);
				const unitPrice = actualUnitPrice ?? Math.round(paidAmount / qty);

				const account = await tx.pettyCashAccount.upsert({
					where: { id: ACCOUNT_ID },
					create: { id: ACCOUNT_ID, balance: 0 },
					update: {}
				});
				const balance = money(account.balance);
				if (paidAmount > balance) {
					throw new Error('INSUFFICIENT_PETTY_CASH');
				}

				const stockAfter = product.stock + qty;
				const stockTx = await tx.stockTransaction.create({
					data: {
						productId: product.id,
						type: 'IN',
						source: 'PETTY_CASH',
						qty,
						stockBefore: product.stock,
						stockAfter,
						note: note || `Petty cash purchase, paid ${paidAmount}`,
						createdBy
					}
				});

				const productUpdate: { stock: number; price?: number } = { stock: stockAfter };
				if (updateCatalog && actualUnitPrice != null && actualUnitPrice >= 0) {
					productUpdate.price = actualUnitPrice;
				}
				await tx.product.update({
					where: { id: product.id },
					data: productUpdate
				});

				const spendBalance = balance - paidAmount;
				await tx.pettyCashAccount.update({
					where: { id: ACCOUNT_ID },
					data: { balance: spendBalance }
				});

				const spend = await tx.pettyCashTransaction.create({
					data: {
						type: 'SPEND',
						amount: paidAmount,
						balanceAfter: spendBalance,
						expectedAmount,
						paidAmount,
						catalogUnitPrice,
						actualUnitPrice: unitPrice,
						qty,
						productId: product.id,
						stockTransactionId: stockTx.id,
						note,
						createdBy
					},
					include: txInclude
				});

				let refund: typeof spend | null = null;
				if (refundAmount > 0) {
					refund = await tx.pettyCashTransaction.create({
						data: {
							type: 'REFUND',
							amount: refundAmount,
							balanceAfter: spendBalance,
							expectedAmount,
							paidAmount,
							catalogUnitPrice,
							actualUnitPrice: unitPrice,
							qty,
							productId: product.id,
							stockTransactionId: stockTx.id,
							note: note || `Unused vs catalog (${expectedAmount} − ${paidAmount})`,
							createdBy
						},
						include: txInclude
					});
				}

				return { spend, refund, stockTransactionId: stockTx.id, balance: spendBalance };
			});

			return {
				success: true as const,
				data: {
					spend: mapTx(result.spend),
					refund: result.refund ? mapTx(result.refund) : null,
					stockTransactionId: result.stockTransactionId,
					balance: result.balance
				}
			};
		} catch (err) {
			if (err instanceof Error && err.message === 'PRODUCT_NOT_FOUND') {
				return { success: false as const, errors: { productId: ['Product not found'] } };
			}
			if (err instanceof Error && err.message === 'INSUFFICIENT_PETTY_CASH') {
				return {
					success: false as const,
					errors: { paidAmount: ['Petty cash balance is not enough for this amount'] }
				};
			}
			throw err;
		}
	}

	return { getBalance, list, listForExport, topUp, buyStock };
}
