import { db } from '$lib/server/db';
import type { Product, ProductStatus } from '$lib/types';

export interface ProductFilters {
	search?: string;
	categoryId?: string;
	status?: ProductStatus;
	lowStock?: boolean;
	page?: number;
	limit?: number;
	sort?: string;
	order?: 'asc' | 'desc';
}

export const PRODUCT_SORT_FIELDS = ['name', 'code', 'stock'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

function productOrderBy(sort?: string, order?: string) {
	if (!sort || !(PRODUCT_SORT_FIELDS as readonly string[]).includes(sort)) {
		return { createdAt: 'desc' as const };
	}
	const dir = order === 'desc' ? 'desc' : 'asc';
	return { [sort]: dir };
}

export interface ProductCreateInput {
	code: string;
	name: string;
	categoryId: string;
	unit: string;
	stock: number;
	minimumStock: number;
	price: number;
	imageUrl?: string | null;
	status: ProductStatus;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

export function productRepository() {
	async function findAll(filters: ProductFilters = {}) {
		const { search, categoryId, status, lowStock, page = 1, limit = 10, sort, order } = filters;
		const skip = (page - 1) * limit;
		const include = productInclude();

		const baseWhere: Record<string, unknown> = { deletedAt: null };
		if (search) {
			baseWhere.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ code: { contains: search, mode: 'insensitive' } }
			];
		}
		if (categoryId) baseWhere.categoryId = categoryId;
		if (status) baseWhere.status = status;

		if (lowStock) {
			const all = await db.product.findMany({
				where: baseWhere,
				orderBy: productOrderBy(sort, order),
				include
			});
			const filtered = all.filter((p) => p.stock <= p.minimumStock);
			const total = filtered.length;
			const data = filtered.slice(skip, skip + limit);
			return {
				data: await attachLastIn(data.map(mapProduct)),
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
			};
		}

		const [data, total] = await Promise.all([
			db.product.findMany({
				where: baseWhere,
				skip,
				take: limit,
				orderBy: productOrderBy(sort, order),
				include
			}),
			db.product.count({ where: baseWhere })
		]);

		return {
			data: await attachLastIn(data.map(mapProduct)),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
		};
	}

	async function findById(id: string) {
		const product = await db.product.findFirst({
			where: { id, deletedAt: null },
			include: productInclude()
		});
		return product ? (await attachLastIn([mapProduct(product)]))[0] : null;
	}

	async function findByCode(code: string) {
		const product = await db.product.findFirst({ where: { code, deletedAt: null } });
		return product;
	}

	async function create(input: ProductCreateInput) {
		const product = await db.product.create({
			data: input,
			include: { category: { select: { id: true, name: true } } }
		});
		return mapProduct(product);
	}

	async function update(id: string, input: ProductUpdateInput) {
		const product = await db.product.update({
			where: { id },
			data: input,
			include: { category: { select: { id: true, name: true } } }
		});
		return mapProduct(product);
	}

	async function remove(id: string) {
		await db.product.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	return { findAll, findById, findByCode, create, update, remove };
}

function productInclude() {
	return {
		category: { select: { id: true, name: true } },
		productSuppliers: {
			where: { supplier: { deletedAt: null } },
			include: { supplier: true }
		}
	};
}

async function attachLastIn(products: Product[]): Promise<Product[]> {
	if (products.length === 0) return products;
	const grouped = await db.stockTransaction.groupBy({
		by: ['productId'],
		where: {
			productId: { in: products.map((p) => p.id) },
			type: 'IN',
			deletedAt: null
		},
		_max: { createdAt: true }
	});
	const lastIn = new Map(
		grouped.map((row) => [row.productId, row._max.createdAt?.toISOString() ?? null])
	);
	return products.map((product) => ({
		...product,
		lastInAt: lastIn.get(product.id) ?? null
	}));
}

function mapProduct(p: {
	id: string;
	code: string;
	name: string;
	categoryId: string;
	category?: { id: string; name: string } | null;
	unit: string;
	stock: number;
	minimumStock: number;
	price: unknown;
	imageUrl?: string | null;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	productSuppliers?: Array<{
		supplier: {
			id: string;
			name: string;
			type: string | null;
			phone: string | null;
			address: string | null;
		};
	}>;
}): Product {
	return {
		id: p.id,
		code: p.code,
		name: p.name,
		categoryId: p.categoryId,
		category: p.category ?? undefined,
		unit: p.unit,
		stock: p.stock,
		minimumStock: p.minimumStock,
		price: Number(p.price),
		imageUrl: p.imageUrl ?? null,
		status: p.status as ProductStatus,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
		suppliers: p.productSuppliers
			?.map((row) => ({
				id: row.supplier.id,
				name: row.supplier.name,
				type: row.supplier.type ?? 'GENERAL',
				phone: row.supplier.phone,
				address: row.supplier.address
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
}
