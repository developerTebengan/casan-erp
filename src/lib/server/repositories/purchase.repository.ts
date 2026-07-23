import { db } from '$lib/server/db';
import type { Purchase, PurchasePriority, ApprovalStatus, UserRole } from '$lib/types';

export interface PurchaseFilters {
	search?: string;
	supplierId?: string;
	priority?: PurchasePriority;
	approvalStatus?: ApprovalStatus;
	page?: number;
	limit?: number;
}

export interface PurchaseItemInput {
	productId: string;
	qty: number;
	price: number;
	notes?: string;
}

export interface PurchaseCreateInput {
	prNumber: string;
	supplierId?: string | null;
	dateOfRequest: Date;
	priority: PurchasePriority;
	requesterId: string;
	dateRequired: Date;
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
		const { search, supplierId, priority, approvalStatus, page = 1, limit = 10 } = filters;

		const where: Record<string, unknown> = { deletedAt: null };
		if (search) where.prNumber = { contains: search, mode: 'insensitive' };
		if (supplierId) where.supplierId = supplierId;
		if (priority) where.priority = priority;
		if (approvalStatus) where.approvalStatus = approvalStatus;

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			db.purchase.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: {
					supplier: { select: { id: true, name: true } },
					requester: { select: { id: true, name: true, email: true, role: true } }
				}
			}),
			db.purchase.count({ where })
		]);

		return {
			data: data.map(mapPurchase),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
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
					include: { product: { include: { category: { select: { name: true } } } } }
				}
			}
		});
		return purchase ? mapPurchase(purchase) : null;
	}

	async function findByPrNumber(prNumber: string) {
		return db.purchase.findFirst({ where: { prNumber, deletedAt: null } });
	}

	async function create(input: PurchaseCreateInput) {
		const total = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);

		const purchase = await db.purchase.create({
			data: {
				prNumber: input.prNumber,
				supplierId: input.supplierId,
				dateOfRequest: input.dateOfRequest,
				priority: input.priority,
				requesterId: input.requesterId,
				dateRequired: input.dateRequired,
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
					include: { product: { include: { category: { select: { name: true } } } } }
				}
			}
		});

		return mapPurchase(purchase);
	}

	async function remove(id: string) {
		await db.purchase.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	async function update(
		id: string,
		data: Partial<{
			departmentHeadStatus: ApprovalStatus;
			departmentHeadApprovedAt: Date;
			financeStatus: ApprovalStatus;
			financeApprovedAt: Date;
			finalStatus: ApprovalStatus;
			finalApprovedAt: Date;
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
					include: { product: { include: { category: { select: { name: true } } } } }
				}
			}
		});
		return mapPurchase(purchase);
	}

	return { findAll, findById, findByPrNumber, create, remove, update };
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
			notes: item.notes
		}))
	};
}
