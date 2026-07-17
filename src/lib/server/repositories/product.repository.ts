import { db } from '$lib/server/db';
import type { Product, ProductStatus } from '$lib/types';

export interface ProductFilters {
	search?: string;
	categoryId?: string;
	status?: ProductStatus;
	page?: number;
	limit?: number;
}

export interface ProductCreateInput {
	code: string;
	name: string;
	categoryId: string;
	unit: string;
	stock: number;
	minimumStock: number;
	purchasePrice: number;
	sellingPrice: number;
	status: ProductStatus;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

export function productRepository() {
	async function findAll(filters: ProductFilters = {}) {
		const { search, categoryId, status, page = 1, limit = 10 } = filters;

		const where: Record<string, unknown> = {};
		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ code: { contains: search, mode: 'insensitive' } }
			];
		}
		if (categoryId) where.categoryId = categoryId;
		if (status) where.status = status;

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			db.product.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: { category: { select: { id: true, name: true } } }
			}),
			db.product.count({ where })
		]);

		return {
			data: data.map(mapProduct),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
		};
	}

	async function findById(id: string) {
		const product = await db.product.findUnique({
			where: { id },
			include: { category: { select: { id: true, name: true } } }
		});
		return product ? mapProduct(product) : null;
	}

	async function findByCode(code: string) {
		const product = await db.product.findUnique({ where: { code } });
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
		await db.product.delete({ where: { id } });
	}

	return { findAll, findById, findByCode, create, update, remove };
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
	purchasePrice: unknown;
	sellingPrice: unknown;
	status: string;
	createdAt: Date;
	updatedAt: Date;
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
		purchasePrice: Number(p.purchasePrice),
		sellingPrice: Number(p.sellingPrice),
		status: p.status as ProductStatus,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString()
	};
}
