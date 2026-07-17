import { db } from '$lib/server/db';
import type { Purchase, PurchaseItem, PurchaseStatus } from '$lib/types';

export interface PurchaseFilters {
	search?: string;
	supplierId?: string;
	status?: PurchaseStatus;
	page?: number;
	limit?: number;
}

export interface PurchaseItemInput {
	productId: string;
	qty: number;
	price: number;
}

export interface PurchaseCreateInput {
	poNumber: string;
	supplierId: string;
	purchaseDate: Date;
	status: PurchaseStatus;
	items: PurchaseItemInput[];
}

export function purchaseRepository() {
	async function findAll(filters: PurchaseFilters = {}) {
		const { search, supplierId, status, page = 1, limit = 10 } = filters;

		const where: Record<string, unknown> = {};
		if (search) where.poNumber = { contains: search, mode: 'insensitive' };
		if (supplierId) where.supplierId = supplierId;
		if (status) where.status = status;

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			db.purchase.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: { supplier: { select: { id: true, name: true } } }
			}),
			db.purchase.count({ where })
		]);

		return {
			data: data.map(mapPurchase),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
		};
	}

	async function findById(id: string): Promise<Purchase | null> {
		const purchase = await db.purchase.findUnique({
			where: { id },
			include: {
				supplier: { select: { id: true, name: true, phone: true, address: true } },
				items: {
					include: { product: { include: { category: { select: { name: true } } } } }
				}
			}
		});
		return purchase ? mapPurchase(purchase) : null;
	}

	async function findByPoNumber(poNumber: string) {
		return db.purchase.findUnique({ where: { poNumber } });
	}

	async function create(input: PurchaseCreateInput) {
		const total = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);

		const purchase = await db.purchase.create({
			data: {
				poNumber: input.poNumber,
				supplierId: input.supplierId,
				purchaseDate: input.purchaseDate,
				status: input.status,
				total,
				items: {
					create: input.items.map((item) => ({
						productId: item.productId,
						qty: item.qty,
						price: item.price,
						subtotal: item.qty * item.price
					}))
				}
			},
			include: {
				supplier: { select: { id: true, name: true } },
				items: {
					include: { product: { include: { category: { select: { name: true } } } } }
				}
			}
		});

		return mapPurchase(purchase);
	}

	async function updateStockForPurchase(items: PurchaseItemInput[], action: 'add' | 'subtract') {
		for (const item of items) {
			const product = await db.product.findUnique({ where: { id: item.productId } });
			if (product) {
				const newStock = action === 'add' ? product.stock + item.qty : product.stock - item.qty;
				await db.product.update({
					where: { id: item.productId },
					data: { stock: Math.max(0, newStock) }
				});
			}
		}
	}

	async function remove(id: string) {
		const purchase = await db.purchase.findUnique({
			where: { id },
			include: { items: true }
		});
		if (purchase && purchase.status === 'RECEIVED') {
			await updateStockForPurchase(
				purchase.items.map((i) => ({ productId: i.productId, qty: i.qty, price: Number(i.price) })),
				'subtract'
			);
		}
		await db.purchase.delete({ where: { id } });
	}

	return { findAll, findById, findByPoNumber, create, remove };
}

function mapPurchase(p: {
	id: string;
	poNumber: string;
	supplierId: string;
	supplier?: {
		id: string;
		name: string;
		phone?: string | null | undefined;
		address?: string | null | undefined;
	} | null;
	purchaseDate: Date;
	status: string;
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
		poNumber: p.poNumber,
		supplierId: p.supplierId,
		supplier: p.supplier ?? undefined,
		purchaseDate: p.purchaseDate.toISOString(),
		status: p.status as PurchaseStatus,
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
						purchasePrice: 0,
						sellingPrice: 0,
						status: 'ACTIVE',
						createdAt: '',
						updatedAt: ''
					}
				: undefined,
			qty: item.qty,
			price: Number(item.price),
			subtotal: Number(item.subtotal)
		}))
	};
}
