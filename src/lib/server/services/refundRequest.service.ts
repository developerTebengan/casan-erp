import { db } from '$lib/server/db';
import { dayRange } from '$lib/utils/dayRange';
import {
	canSubmitRefundRequest,
	leftover,
	prTotalForSupplier,
	settlementBill,
	supplierKey
} from '$lib/purchasing/settlement';

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

	async function saveAndMaybeRequest(
		purchaseId: string,
		input: {
			supplierId?: unknown;
			actualGoods?: unknown;
			tax?: unknown;
			delivery?: unknown;
			other?: unknown;
			destination?: unknown;
			submitRequest?: unknown;
		},
		createdBy?: string | null
	) {
		const supplierId = input.supplierId ? String(input.supplierId) : null;
		const key = supplierKey(supplierId);
		const actualGoods = money(input.actualGoods);
		const tax = money(input.tax);
		const delivery = money(input.delivery);
		const other = money(input.other);
		if (actualGoods < 0 || tax < 0 || delivery < 0 || other < 0) {
			return { success: false as const, errors: { form: ['Amounts cannot be negative'] } };
		}

		const purchase = await db.purchase.findFirst({
			where: { id: purchaseId, deletedAt: null },
			include: { items: true, supplier: true }
		});
		if (!purchase) {
			return { success: false as const, errors: { form: ['Purchase not found'] } };
		}

		const prTotal = prTotalForSupplier(
			purchase.items.map((item) => ({
				supplierId: item.supplierId,
				qty: item.qty,
				price: Number(item.price)
			})),
			key
		);
		const bill = settlementBill(actualGoods, tax, delivery, other);
		const left = leftover(prTotal, bill);
		const submitRequest = Boolean(input.submitRequest);

		if (submitRequest && !canSubmitRefundRequest(left)) {
			return { success: false as const, errors: { form: ['No leftover to refund'] } };
		}

		const destination = String(input.destination ?? '');
		if (submitRequest && destination !== 'KAS_KECIL' && destination !== 'BANK') {
			return { success: false as const, errors: { destination: ['Choose kas kecil or bank'] } };
		}

		try {
			const result = await db.$transaction(async (tx) => {
				const settlement = await tx.purchaseSupplierSettlement.upsert({
					where: { purchaseId_supplierKey: { purchaseId, supplierKey: key } },
					create: {
						purchaseId,
						supplierId,
						supplierKey: key,
						actualGoods,
						tax,
						delivery,
						other
					},
					update: { actualGoods, tax, delivery, other, supplierId }
				});

				if (!submitRequest) {
					return { settlement, request: null as null };
				}

				const existing = await tx.refundRequest.findFirst({
					where: {
						purchaseId,
						supplierKey: key,
						status: { in: ['PENDING', 'APPROVED'] }
					}
				});
				if (existing) throw new Error('DUPLICATE');

				const request = await tx.refundRequest.create({
					data: {
						destination: destination as 'KAS_KECIL' | 'BANK',
						amount: left,
						purchaseId,
						supplierId,
						supplierKey: key,
						prTotal,
						actualGoods,
						tax,
						delivery,
						other,
						bill,
						createdBy
					},
					include: requestInclude
				});
				return { settlement, request };
			});

			return {
				success: true as const,
				data: {
					leftover: left,
					bill,
					prTotal,
					request: result.request ? mapRequest(result.request) : null
				}
			};
		} catch (err) {
			if (err instanceof Error && err.message === 'DUPLICATE') {
				return {
					success: false as const,
					status: 409 as const,
					errors: { form: ['A refund request already exists for this supplier'] }
				};
			}
			throw err;
		}
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

	return { listSettlements, listRequestsForPurchase, saveAndMaybeRequest, decide, listQueue };
}
