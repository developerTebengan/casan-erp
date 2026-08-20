import { db } from '$lib/server/db';
import { dayRange } from '$lib/utils/dayRange';
import {
	actualExtras,
	approvedGrand,
	capRefundAmount,
	leftoverFromPr,
	lineGoodsTotal,
	parseNonNegMoney
} from '$lib/purchasing/leftover';
import { canSubmitRefundRequest } from '$lib/purchasing/settlement';
import { NONE_SUPPLIER_KEY } from '$lib/purchasing/settlement';

const ACCOUNT_ID = 'default';

function money(value: unknown): number {
	return Math.round(Number(value) || 0);
}

function mapRequest(row: {
	id: string;
	status: string;
	destination: string;
	amount: unknown;
	purchaseId: string;
	supplierId: string | null;
	supplierKey: string;
	prTotal: unknown;
	actualGoods: unknown;
	tax: unknown;
	delivery: unknown;
	other: unknown;
	bill: unknown;
	rejectReason: string | null;
	createdBy: string | null;
	decidedBy: string | null;
	createdAt: Date;
	decidedAt: Date | null;
	purchase?: { prNumber: string } | null;
	supplier?: { id: string; name: string } | null;
}) {
	return {
		kind: 'PR_LEFTOVER' as const,
		id: row.id,
		status: row.status,
		destination: row.destination,
		amount: money(row.amount),
		purchaseId: row.purchaseId,
		prNumber: row.purchase?.prNumber ?? '',
		supplierId: row.supplierId,
		supplierKey: row.supplierKey,
		supplierName: row.supplier?.name ?? (row.supplierKey === 'none' ? 'No supplier' : ''),
		prTotal: money(row.prTotal),
		actualGoods: money(row.actualGoods),
		tax: money(row.tax),
		delivery: money(row.delivery),
		other: money(row.other),
		bill: money(row.bill),
		rejectReason: row.rejectReason,
		createdBy: row.createdBy,
		decidedBy: row.decidedBy,
		createdAt: row.createdAt.toISOString(),
		decidedAt: row.decidedAt?.toISOString() ?? null
	};
}

const requestInclude = {
	purchase: { select: { prNumber: true } },
	supplier: { select: { id: true, name: true } }
};

export function refundRequestService() {
	async function listSettlements(purchaseId: string) {
		const rows = await db.purchaseSupplierSettlement.findMany({ where: { purchaseId } });
		return rows.map((row) => ({
			supplierId: row.supplierId,
			supplierKey: row.supplierKey,
			actualGoods: money(row.actualGoods),
			tax: money(row.tax),
			delivery: money(row.delivery),
			other: money(row.other)
		}));
	}

	async function listRequestsForPurchase(purchaseId: string) {
		const rows = await db.refundRequest.findMany({
			where: { purchaseId },
			include: requestInclude,
			orderBy: { createdAt: 'desc' }
		});
		return rows.map(mapRequest);
	}

	async function snapshot(purchaseId: string) {
		const purchase = await db.purchase.findFirst({
			where: { id: purchaseId, deletedAt: null },
			include: { items: true }
		});
		if (!purchase) return null;
		const txs = await db.stockTransaction.findMany({
			where: {
				referenceId: purchaseId,
				source: 'PURCHASE',
				type: 'IN',
				deletedAt: null
			},
			select: { productId: true, qty: true, unitPrice: true }
		});
		const priceByProduct: Record<string, number> = {};
		for (const item of purchase.items) {
			if (priceByProduct[item.productId] == null) {
				priceByProduct[item.productId] = money(item.price);
			}
		}
		const actualGoods = txs.reduce((sum, tx) => {
			const unit =
				tx.unitPrice == null ? (priceByProduct[tx.productId] ?? 0) : money(tx.unitPrice);
			return sum + Math.abs(tx.qty) * unit;
		}, 0);
		const lineTotal = lineGoodsTotal(
			purchase.items.map((item) => ({ qty: item.qty, price: money(item.price) }))
		);
		const tax = money(purchase.tax);
		const shipping = money(purchase.shipping);
		const otherFees = money(purchase.otherFees);
		const extras = actualExtras({
			tax,
			shipping,
			otherFees,
			actualTax: purchase.actualTax == null ? null : money(purchase.actualTax),
			actualShipping: purchase.actualShipping == null ? null : money(purchase.actualShipping),
			actualOtherFees: purchase.actualOtherFees == null ? null : money(purchase.actualOtherFees)
		});
		const grand = approvedGrand(lineTotal, tax, shipping, otherFees);
		const left = leftoverFromPr(grand, actualGoods, extras);
		const active = await db.refundRequest.findFirst({
			where: { purchaseId, status: { in: ['PENDING', 'APPROVED'] } }
		});
		return {
			purchase,
			lineTotal,
			tax,
			shipping,
			otherFees,
			actualTax: purchase.actualTax == null ? null : money(purchase.actualTax),
			actualShipping: purchase.actualShipping == null ? null : money(purchase.actualShipping),
			actualOtherFees: purchase.actualOtherFees == null ? null : money(purchase.actualOtherFees),
			approvedGrand: grand,
			actualGoods: money(actualGoods),
			actualExtras: extras,
			leftover: left,
			hasActive: Boolean(active)
		};
	}

	async function saveAndMaybeRequest(
		purchaseId: string,
		input: {
			actualTax?: unknown;
			actualShipping?: unknown;
			actualOtherFees?: unknown;
			destination?: unknown;
			submitRequest?: unknown;
		},
		createdBy?: string | null
	) {
		const actualTax = parseNonNegMoney(input.actualTax);
		const actualShipping = parseNonNegMoney(input.actualShipping);
		const actualOtherFees = parseNonNegMoney(input.actualOtherFees);
		if (actualTax == null || actualShipping == null || actualOtherFees == null) {
			return { success: false as const, errors: { form: ['Amounts cannot be negative'] } };
		}

		const purchase = await db.purchase.findFirst({
			where: { id: purchaseId, deletedAt: null }
		});
		if (!purchase) {
			return { success: false as const, errors: { form: ['Purchase not found'] } };
		}
		if (purchase.approvalStatus !== 'APPROVED') {
			return { success: false as const, errors: { form: ['Only an approved PR can be settled'] } };
		}

		await db.purchase.update({
			where: { id: purchaseId },
			data: { actualTax, actualShipping, actualOtherFees }
		});

		const snap = await snapshot(purchaseId);
		if (!snap) {
			return { success: false as const, errors: { form: ['Purchase not found'] } };
		}

		const submitRequest = Boolean(input.submitRequest);
		if (!submitRequest) {
			return {
				success: true as const,
				data: { leftover: snap.leftover, bill: snap.actualGoods + snap.actualExtras, prTotal: snap.approvedGrand, request: null }
			};
		}
		if (!canSubmitRefundRequest(snap.leftover)) {
			return { success: false as const, errors: { form: ['No leftover to refund'] } };
		}
		const destination = String(input.destination ?? '');
		if (destination !== 'KAS_KECIL' && destination !== 'BANK') {
			return { success: false as const, errors: { destination: ['Choose kas kecil or bank'] } };
		}
		if (snap.hasActive) {
			return {
				success: false as const,
				status: 409 as const,
				errors: { form: ['A refund request already exists for this PR'] }
			};
		}

		const request = await db.refundRequest.create({
			data: {
				destination,
				amount: snap.leftover,
				purchaseId,
				supplierId: null,
				supplierKey: NONE_SUPPLIER_KEY,
				prTotal: snap.approvedGrand,
				actualGoods: snap.actualGoods,
				tax: snap.actualTax ?? snap.tax,
				delivery: snap.actualShipping ?? snap.shipping,
				other: snap.actualOtherFees ?? snap.otherFees,
				bill: snap.actualGoods + snap.actualExtras,
				createdBy
			},
			include: requestInclude
		});
		return {
			success: true as const,
			data: {
				leftover: snap.leftover,
				bill: snap.actualGoods + snap.actualExtras,
				prTotal: snap.approvedGrand,
				request: mapRequest(request)
			}
		};
	}

	async function createFromList(
		input: {
			purchaseId?: unknown;
			amount?: unknown;
			destination?: unknown;
			note?: unknown;
		},
		createdBy?: string | null
	) {
		const purchaseId = String(input.purchaseId ?? '');
		if (!purchaseId) {
			return { success: false as const, errors: { purchaseId: ['Select a purchase request'] } };
		}
		const snap = await snapshot(purchaseId);
		if (!snap) {
			return { success: false as const, errors: { purchaseId: ['Purchase not found'] } };
		}
		if (snap.purchase.approvalStatus !== 'APPROVED') {
			return { success: false as const, errors: { purchaseId: ['Only an approved PR can be refunded'] } };
		}
		if (snap.hasActive) {
			return {
				success: false as const,
				status: 409 as const,
				errors: { form: ['A refund request already exists for this PR'] }
			};
		}
		const capped = capRefundAmount(Number(input.amount), snap.leftover);
		if (capped == null) {
			return {
				success: false as const,
				errors: { amount: ['Amount must be greater than 0 and not more than leftover'] }
			};
		}
		const destination = String(input.destination ?? '');
		if (destination !== 'KAS_KECIL' && destination !== 'BANK') {
			return { success: false as const, errors: { destination: ['Choose kas kecil or bank'] } };
		}
		const request = await db.refundRequest.create({
			data: {
				destination,
				amount: capped,
				purchaseId,
				supplierId: null,
				supplierKey: NONE_SUPPLIER_KEY,
				prTotal: snap.approvedGrand,
				actualGoods: snap.actualGoods,
				tax: snap.actualTax ?? snap.tax,
				delivery: snap.actualShipping ?? snap.shipping,
				other: snap.actualOtherFees ?? snap.otherFees,
				bill: snap.actualGoods + snap.actualExtras,
				createdBy
			},
			include: requestInclude
		});
		return { success: true as const, data: mapRequest(request) };
	}

	async function decide(
		id: string,
		input: { action?: unknown; reason?: unknown },
		decidedBy?: string | null
	) {
		const action = String(input.action ?? '');
		if (action !== 'approve' && action !== 'reject') {
			return { success: false as const, errors: { form: ['Choose approve or reject'] } };
		}
		if (action === 'reject') {
			const reason = String(input.reason ?? '').trim();
			if (reason.length < 3) {
				return { success: false as const, errors: { reason: ['Reason must be at least 3 characters'] } };
			}
		}

		try {
			const result = await db.$transaction(async (tx) => {
				const request = await tx.refundRequest.findUnique({
					where: { id },
					include: { purchase: true, supplier: true }
				});
				if (!request) throw new Error('NOT_FOUND');
				if (request.status !== 'PENDING') throw new Error('NOT_PENDING');

				if (action === 'reject') {
					const updated = await tx.refundRequest.update({
						where: { id },
						data: {
							status: 'REJECTED',
							rejectReason: String(input.reason).trim(),
							decidedBy,
							decidedAt: new Date()
						},
						include: requestInclude
					});
					return updated;
				}

				const amount = money(request.amount);
				if (!(amount > 0)) throw new Error('BAD_AMOUNT');

				const account = await tx.pettyCashAccount.upsert({
					where: { id: ACCOUNT_ID },
					create: { id: ACCOUNT_ID, balance: 0 },
					update: {}
				});
				const balance = money(account.balance);
				const note = `PR leftover ${request.purchase.prNumber} — ${request.supplier?.name ?? 'No supplier'}`;

				let nextBalance = balance;
				let type: 'TOP_UP' | 'TRANSFER' = 'TRANSFER';
				let sourceOfFund: 'PR_LEFTOVER' | null = null;
				if (request.destination === 'KAS_KECIL') {
					nextBalance = balance + amount;
					type = 'TOP_UP';
					sourceOfFund = 'PR_LEFTOVER';
					await tx.pettyCashAccount.update({
						where: { id: ACCOUNT_ID },
						data: { balance: nextBalance }
					});
				}

				const ledger = await tx.pettyCashTransaction.create({
					data: {
						type,
						amount,
						balanceAfter: nextBalance,
						sourceOfFund,
						note,
						createdBy: decidedBy
					}
				});

				return tx.refundRequest.update({
					where: { id },
					data: {
						status: 'APPROVED',
						pettyCashTransactionId: ledger.id,
						decidedBy,
						decidedAt: new Date()
					},
					include: requestInclude
				});
			});

			return { success: true as const, data: mapRequest(result) };
		} catch (err) {
			if (err instanceof Error && err.message === 'NOT_FOUND') {
				return { success: false as const, errors: { form: ['Request not found'] } };
			}
			if (err instanceof Error && err.message === 'NOT_PENDING') {
				return { success: false as const, errors: { form: ['Request is already decided'] } };
			}
			if (err instanceof Error && err.message === 'BAD_AMOUNT') {
				return { success: false as const, errors: { amount: ['Amount must be greater than 0'] } };
			}
			throw err;
		}
	}

	async function listQueue(filters: {
		tab?: string;
		kind?: string;
		destination?: string;
		from?: string;
		to?: string;
		page?: number;
		limit?: number;
	} = {}) {
		const { tab = 'pending', kind, destination, from, to, page = 1, limit = 20 } = filters;
		const createdAt = dayRange(from, to);
		const skip = (page - 1) * limit;

		if (tab !== 'posted') {
			const where: Record<string, unknown> = { status: 'PENDING' };
			if (destination === 'KAS_KECIL' || destination === 'BANK') where.destination = destination;
			if (createdAt) where.createdAt = createdAt;
			const [rows, total] = await Promise.all([
				db.refundRequest.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: 'desc' },
					include: requestInclude
				}),
				db.refundRequest.count({ where })
			]);
			return {
				tab: 'pending' as const,
				rows: rows.map(mapRequest),
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
			};
		}

		if (kind === 'CATALOG_VARIANCE') {
			const where: Record<string, unknown> = { type: 'REFUND' };
			if (createdAt) where.createdAt = createdAt;
			const [rows, total] = await Promise.all([
				db.pettyCashTransaction.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: 'desc' },
					include: { product: { select: { id: true, code: true, name: true } } }
				}),
				db.pettyCashTransaction.count({ where })
			]);
			return {
				tab: 'posted' as const,
				rows: rows.map((row) => ({
					kind: 'CATALOG_VARIANCE' as const,
					id: row.id,
					status: 'POSTED',
					destination: null,
					amount: money(row.amount),
					purchaseId: null,
					prNumber: '',
					supplierId: null,
					supplierName: '',
					product: row.product,
					qty: row.qty,
					expectedAmount: row.expectedAmount == null ? null : money(row.expectedAmount),
					paidAmount: row.paidAmount == null ? null : money(row.paidAmount),
					note: row.note,
					createdAt: row.createdAt.toISOString()
				})),
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
			};
		}

		const whereReq: Record<string, unknown> = { status: { in: ['APPROVED', 'REJECTED'] } };
		if (destination === 'KAS_KECIL' || destination === 'BANK') whereReq.destination = destination;
		if (createdAt) whereReq.createdAt = createdAt;
		const whereCat: Record<string, unknown> = { type: 'REFUND' };
		if (createdAt) whereCat.createdAt = createdAt;

		if (kind === 'PR_LEFTOVER') {
			const [rows, total] = await Promise.all([
				db.refundRequest.findMany({
					where: whereReq,
					skip,
					take: limit,
					orderBy: { createdAt: 'desc' },
					include: requestInclude
				}),
				db.refundRequest.count({ where: whereReq })
			]);
			return {
				tab: 'posted' as const,
				rows: rows.map(mapRequest),
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
			};
		}

		const [requests, catalog] = await Promise.all([
			db.refundRequest.findMany({
				where: whereReq,
				orderBy: { createdAt: 'desc' },
				include: requestInclude
			}),
			db.pettyCashTransaction.findMany({
				where: whereCat,
				orderBy: { createdAt: 'desc' },
				include: { product: { select: { id: true, code: true, name: true } } }
			})
		]);
		const merged = [
			...requests.map(mapRequest),
			...catalog.map((row) => ({
				kind: 'CATALOG_VARIANCE' as const,
				id: row.id,
				status: 'POSTED',
				destination: null as null,
				amount: money(row.amount),
				purchaseId: null as null,
				prNumber: '',
				supplierId: null as null,
				supplierName: '',
				product: row.product,
				qty: row.qty,
				expectedAmount: row.expectedAmount == null ? null : money(row.expectedAmount),
				paidAmount: row.paidAmount == null ? null : money(row.paidAmount),
				note: row.note,
				createdAt: row.createdAt.toISOString()
			}))
		].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
		const total = merged.length;
		const rows = merged.slice(skip, skip + limit);
		return {
			tab: 'posted' as const,
			rows,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
		};
	}

	return { listSettlements, listRequestsForPurchase, snapshot, saveAndMaybeRequest, createFromList, decide, listQueue };
}
