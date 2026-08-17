import { db } from '$lib/server/db';
import { applyFulfillment } from '$lib/purchasing/list-status';
import { nextPrNumberFromLatest } from '$lib/purchasing/catalog';
import type { Purchase, PurchasePriority, ApprovalStatus, UserRole } from '$lib/types';

export interface PurchaseFilters {
	search?: string;
	supplierId?: string;
	priority?: PurchasePriority;
	approvalStatus?: ApprovalStatus;
	awaitingApproverId?: string;
	requesterId?: string;
	/** History for a specific approver: waiting / approved / rejected by them */
	myApproverId?: string;
	myDecision?: 'PENDING' | 'APPROVED' | 'REJECTED';
	/** Filter approved/rejected decisions on or after this date (ISO date) */
	decidedAfter?: string;
	/** Filter approved/rejected decisions on or before this date (ISO date) */
	decidedBefore?: string;
	page?: number;
	limit?: number;
	sort?: string;
	order?: 'asc' | 'desc';
}

export const PURCHASE_SORT_FIELDS = ['prNumber', 'dateOfRequest', 'decisionDeadline'] as const;
export type PurchaseSortField = (typeof PURCHASE_SORT_FIELDS)[number];

function purchaseOrderBy(sort?: string, order?: string) {
	if (!sort || !(PURCHASE_SORT_FIELDS as readonly string[]).includes(sort)) {
		return [{ updatedAt: 'desc' as const }, { createdAt: 'desc' as const }];
	}
	const dir = order === 'desc' ? 'desc' : 'asc';
	return { [sort]: dir };
}

export interface PurchaseItemInput {
	productId: string;
	qty: number;
	price: number;
	notes?: string;
	supplierId?: string | null;
}

export interface PurchaseCreateInput {
	prNumber?: string;
	supplierId?: string | null;
	dateOfRequest: Date;
	priority: PurchasePriority;
	requesterId: string;
	dateRequired: Date;
	decisionDeadline: Date;
	department: string;
	purpose: string;
	comments?: string | null;
	departmentHeadId?: string | null;
	financeApproverId?: string | null;
	finalApproverId?: string | null;
	items: PurchaseItemInput[];
}

export function purchaseRepository() {
	async function findAll(filters: PurchaseFilters = {}) {
		const {
			search,
			supplierId,
			priority,
			approvalStatus,
			awaitingApproverId,
			requesterId,
			myApproverId,
			myDecision,
			decidedAfter,
			decidedBefore,
			page = 1,
			limit = 10,
			sort,
			order
		} = filters;

		const where: Record<string, unknown> = { deletedAt: null };
		if (search) where.prNumber = { contains: search, mode: 'insensitive' };
		if (supplierId) {
			where.AND = [
				{
					OR: [{ supplierId }, { items: { some: { supplierId } } }]
				}
			];
		}
		if (requesterId) where.requesterId = requesterId;
		if (priority) where.priority = priority;
		if (approvalStatus && !awaitingApproverId && !myApproverId) {
			where.approvalStatus = approvalStatus;
		}

		if (awaitingApproverId) {
			where.approvalStatus = 'PENDING';
			where.OR = [
				{
					departmentHeadId: awaitingApproverId,
					departmentHeadStatus: 'PENDING'
				},
				{
					financeApproverId: awaitingApproverId,
					financeStatus: 'PENDING'
				},
				{
					finalApproverId: awaitingApproverId,
					finalStatus: 'PENDING'
				}
			];
		}

		if (myApproverId && myDecision) {
			const after = decidedAfter ? new Date(decidedAfter) : null;
			const before = decidedBefore ? new Date(decidedBefore) : null;
			const afterValid = after && !Number.isNaN(after.getTime()) ? after : null;
			const beforeValid = before && !Number.isNaN(before.getTime()) ? before : null;

			function dateRange(field: string) {
				if (!afterValid && !beforeValid) return {};
				const range: Record<string, Date> = {};
				if (afterValid) range.gte = afterValid;
				if (beforeValid) range.lte = beforeValid;
				return { [field]: range };
			}

			if (myDecision === 'PENDING') {
				where.approvalStatus = 'PENDING';
				where.OR = [
					{ departmentHeadId: myApproverId, departmentHeadStatus: 'PENDING' },
					{ financeApproverId: myApproverId, financeStatus: 'PENDING' },
					{ finalApproverId: myApproverId, finalStatus: 'PENDING' }
				];
			} else if (myDecision === 'APPROVED') {
				where.OR = [
					{
						departmentHeadId: myApproverId,
						departmentHeadStatus: 'APPROVED',
						...dateRange('departmentHeadApprovedAt')
					},
					{
						financeApproverId: myApproverId,
						financeStatus: 'APPROVED',
						...dateRange('financeApprovedAt')
					},
					{
						finalApproverId: myApproverId,
						finalStatus: 'APPROVED',
						...dateRange('finalApprovedAt')
					}
				];
			} else if (myDecision === 'REJECTED') {
				where.OR = [
					{
						departmentHeadId: myApproverId,
						departmentHeadStatus: 'REJECTED',
						...dateRange('updatedAt')
					},
					{
						financeApproverId: myApproverId,
						financeStatus: 'REJECTED',
						...dateRange('updatedAt')
					},
					{
						finalApproverId: myApproverId,
						finalStatus: 'REJECTED',
						...dateRange('updatedAt')
					}
				];
			}
		}

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			db.purchase.findMany({
				where,
				skip,
				take: limit,
				orderBy: purchaseOrderBy(sort, order),
				include: {
					supplier: { select: { id: true, name: true } },
					requester: { select: { id: true, name: true, email: true, role: true } },
					departmentHead: { select: { id: true, name: true, email: true, role: true } },
					financeApprover: { select: { id: true, name: true, email: true, role: true } },
					finalApprover: { select: { id: true, name: true, email: true, role: true } },
					items: {
						select: {
							id: true,
							purchaseId: true,
							productId: true,
							qty: true,
							price: true,
							subtotal: true,
							notes: true,
							supplierId: true,
							supplier: { select: { id: true, name: true } }
						}
					}
				}
			}),
			db.purchase.count({ where })
		]);

		const mapped = data.map(mapPurchase);
		const ids = mapped.map((p) => p.id);
		if (ids.length === 0) {
			return {
				data: mapped,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
			};
		}

		const [ordered, received] = await Promise.all([
			db.purchaseItem.findMany({
				where: { purchaseId: { in: ids } },
				select: { purchaseId: true, productId: true, qty: true }
			}),
			db.stockTransaction.findMany({
				where: {
					referenceId: { in: ids },
					source: 'PURCHASE',
					type: 'IN',
					deletedAt: null
				},
				select: { referenceId: true, productId: true, qty: true }
			})
		]);

		return {
			data: applyFulfillment(
				mapped,
				ordered,
				received.map((tx) => ({
					purchaseId: tx.referenceId ?? '',
					productId: tx.productId,
					qty: tx.qty
				}))
			),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
		};
	}

	async function findById(id: string): Promise<Purchase | null> {
		const purchase = await db.purchase.findFirst({
			where: { id, deletedAt: null },
			include: {
				supplier: { select: { id: true, name: true, phone: true, address: true } },
				requester: { select: { id: true, name: true, email: true, role: true } },
				departmentHead: { select: { id: true, name: true, email: true, role: true } },
				financeApprover: { select: { id: true, name: true, email: true, role: true } },
				finalApprover: { select: { id: true, name: true, email: true, role: true } },
				items: {
					include: {
						product: { include: { category: { select: { name: true } } } },
						supplier: { select: { id: true, name: true } }
					}
				}
			}
		});
		return purchase ? mapPurchase(purchase) : null;
	}

	async function findByPrNumber(prNumber: string) {
		return db.purchase.findFirst({ where: { prNumber, deletedAt: null } });
	}

	async function nextPrNumber(now = new Date()) {
		const year = now.getFullYear();
		const prefix = `PR-${year}-`;
		const last = await db.purchase.findFirst({
			where: { prNumber: { startsWith: prefix } },
			orderBy: { prNumber: 'desc' },
			select: { prNumber: true }
		});
		return nextPrNumberFromLatest(last?.prNumber ?? null, year);
	}

	async function create(input: PurchaseCreateInput) {
		const total = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);
		const prNumber = input.prNumber?.trim() || (await nextPrNumber());

		const purchase = await db.purchase.create({
			data: {
				prNumber,
				supplierId: input.supplierId,
				dateOfRequest: input.dateOfRequest,
				priority: input.priority,
				requesterId: input.requesterId,
				dateRequired: input.dateRequired,
				decisionDeadline: input.decisionDeadline,
				department: input.department,
				purpose: input.purpose,
				comments: input.comments,
				departmentHeadId: input.departmentHeadId,
				financeApproverId: input.financeApproverId,
				finalApproverId: input.finalApproverId,
				total,
				items: {
					create: input.items.map((item) => ({
						productId: item.productId,
						supplierId: item.supplierId || input.supplierId || null,
						qty: item.qty,
						price: item.price,
						subtotal: item.qty * item.price,
						notes: item.notes
					}))
				}
			},
			include: {
				supplier: { select: { id: true, name: true } },
				requester: { select: { id: true, name: true, email: true, role: true } },
				departmentHead: { select: { id: true, name: true, email: true, role: true } },
				financeApprover: { select: { id: true, name: true, email: true, role: true } },
				finalApprover: { select: { id: true, name: true, email: true, role: true } },
				items: {
					include: {
						product: { include: { category: { select: { name: true } } } },
						supplier: { select: { id: true, name: true } }
					}
				}
			}
		});

		return mapPurchase(purchase);
	}

	async function remove(id: string) {
		await db.purchase.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	async function countByApprovalStatus() {
		const groups = await db.purchase.groupBy({
			by: ['approvalStatus'],
			where: { deletedAt: null },
			_count: { _all: true }
		});
		const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, ALL: 0 };
		for (const g of groups) {
			const key = g.approvalStatus as keyof typeof counts;
			if (key in counts) counts[key] = g._count._all;
			counts.ALL += g._count._all;
		}
		return counts;
	}

	async function update(
		id: string,
		data: Partial<{
			departmentHeadId: string | null;
			financeApproverId: string | null;
			finalApproverId: string | null;
			departmentHeadStatus: ApprovalStatus;
			departmentHeadApprovedAt: Date | null;
			financeStatus: ApprovalStatus;
			financeApprovedAt: Date | null;
			finalStatus: ApprovalStatus;
			finalApprovedAt: Date | null;
			approvalStatus: ApprovalStatus;
			rejectionReason: string | null;
		}>
	) {
		const purchase = await db.purchase.update({
			where: { id },
			data,
			include: {
				supplier: { select: { id: true, name: true, phone: true, address: true } },
				requester: { select: { id: true, name: true, email: true, role: true } },
				departmentHead: { select: { id: true, name: true, email: true, role: true } },
				financeApprover: { select: { id: true, name: true, email: true, role: true } },
				finalApprover: { select: { id: true, name: true, email: true, role: true } },
				items: {
					include: {
						product: { include: { category: { select: { name: true } } } },
						supplier: { select: { id: true, name: true } }
					}
				}
			}
		});
		return mapPurchase(purchase);
	}

	return { findAll, findById, findByPrNumber, nextPrNumber, create, remove, update, countByApprovalStatus };
}

function mapUser(
	u: { id: string; name: string; email: string; role: string | UserRole } | null | undefined
): { id: string; name: string; email: string; role: UserRole } | undefined {
	if (!u) return undefined;
	return { ...u, role: u.role as UserRole };
}

function mapPurchase(p: {
	id: string;
	prNumber: string;
	supplierId: string | null;
	supplier?: {
		id: string;
		name: string;
		phone?: string | null | undefined;
		address?: string | null | undefined;
	} | null;
	dateOfRequest: Date;
	priority: string;
	requesterId: string;
	requester?: { id: string; name: string; email: string; role: string | UserRole } | null;
	dateRequired: Date;
	decisionDeadline: Date;
	department: string;
	purpose: string;
	comments: string | null;
	departmentHeadId: string | null;
	departmentHead?: { id: string; name: string; email: string; role: string | UserRole } | null;
	departmentHeadStatus?: string | ApprovalStatus;
	departmentHeadApprovedAt?: Date | null;
	financeApproverId: string | null;
	financeApprover?: { id: string; name: string; email: string; role: string | UserRole } | null;
	financeStatus?: string | ApprovalStatus;
	financeApprovedAt?: Date | null;
	finalApproverId: string | null;
	finalApprover?: { id: string; name: string; email: string; role: string | UserRole } | null;
	finalStatus?: string | ApprovalStatus;
	finalApprovedAt?: Date | null;
	approvalStatus?: string | ApprovalStatus;
	rejectionReason?: string | null;
	total: unknown;
	createdAt: Date;
	updatedAt: Date;
		items?: Array<{
		id: string;
		purchaseId: string;
		productId: string;
		qty: number;
		price: unknown;
		subtotal: unknown;
		notes: string | null;
		supplierId?: string | null;
		supplier?: { id: string; name: string } | null;
		product?: {
			id: string;
			code: string;
			name: string;
			unit: string;
			category?: { name: string } | null;
		};
	}>;
}): Purchase {
	return {
		id: p.id,
		prNumber: p.prNumber,
		supplierId: p.supplierId,
		supplier: p.supplier ?? undefined,
		dateOfRequest: p.dateOfRequest.toISOString(),
		priority: p.priority as PurchasePriority,
		requesterId: p.requesterId,
		requester: mapUser(p.requester),
		dateRequired: p.dateRequired.toISOString(),
		decisionDeadline: p.decisionDeadline.toISOString(),
		department: p.department,
		purpose: p.purpose,
		comments: p.comments,
		departmentHeadId: p.departmentHeadId,
		departmentHead: mapUser(p.departmentHead),
		departmentHeadStatus: (p.departmentHeadStatus as ApprovalStatus) ?? 'PENDING',
		departmentHeadApprovedAt: p.departmentHeadApprovedAt?.toISOString() ?? null,
		financeApproverId: p.financeApproverId,
		financeApprover: mapUser(p.financeApprover),
		financeStatus: (p.financeStatus as ApprovalStatus) ?? 'PENDING',
		financeApprovedAt: p.financeApprovedAt?.toISOString() ?? null,
		finalApproverId: p.finalApproverId,
		finalApprover: mapUser(p.finalApprover),
		finalStatus: (p.finalStatus as ApprovalStatus) ?? 'PENDING',
		finalApprovedAt: p.finalApprovedAt?.toISOString() ?? null,
		approvalStatus: (p.approvalStatus as ApprovalStatus) ?? 'PENDING',
		rejectionReason: p.rejectionReason,
		total: Number(p.total),
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
		items: p.items?.map((item) => ({
			id: item.id,
			purchaseId: item.purchaseId,
			productId: item.productId,
			product: item.product
				? {
						id: item.product.id,
						code: item.product.code,
						name: item.product.name,
						categoryId: '',
						category: item.product.category
							? { id: '', name: item.product.category.name }
							: undefined,
						unit: item.product.unit,
						stock: 0,
						minimumStock: 0,
						price: 0,
						status: 'ACTIVE',
						createdAt: '',
						updatedAt: ''
					}
				: undefined,
			qty: item.qty,
			price: Number(item.price),
			subtotal: Number(item.subtotal),
			notes: item.notes,
			supplierId: item.supplierId ?? null,
			supplier: item.supplier ?? undefined
		}))
	};
}
