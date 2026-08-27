import { db } from '$lib/server/db';
import type { Product, ProductStatus, Supplier } from '$lib/types';

export interface ProductFilters {
	search?: string;
	categoryId?: string;
	status?: ProductStatus;
	lowStock?: boolean;
	preferredSupplierId?: string;
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
	price: number;
	imageUrl?: string | null;
	preferredSupplierId?: string | null;
	status: ProductStatus;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

const productInclude = {
	category: { select: { id: true, name: true } },
	preferredSupplier: {
		select: {
			id: true,
			name: true,
			type: true,
			phone: true,
			address: true,
			status: true
		}
	}
} as const;

export function productRepository() {
	async function findAll(filters: ProductFilters = {}) {
		const {
			search,
			categoryId,
			status,
			lowStock,
			preferredSupplierId,
			page = 1,
			limit = 10
		} = filters;
		const skip = (page - 1) * limit;

		const baseWhere: Record<string, unknown> = { deletedAt: null };
		if (search) {
			baseWhere.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ code: { contains: search, mode: 'insensitive' } }
			];
		}
		if (categoryId) baseWhere.categoryId = categoryId;
		if (status) baseWhere.status = status;
		if (preferredSupplierId) baseWhere.preferredSupplierId = preferredSupplierId;

		if (lowStock) {
			const all = await db.product.findMany({
				where: baseWhere,
				orderBy: { createdAt: 'desc' },
				include: productInclude
			});
			const filtered = all.filter((p) => p.stock <= p.minimumStock);
			const total = filtered.length;
			const data = filtered.slice(skip, skip + limit);
			return {
				data: data.map(mapProduct),
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
			};
		}

		const [data, total] = await Promise.all([
			db.product.findMany({
				where: baseWhere,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: productInclude
			}),
			db.product.count({ where: baseWhere })
		]);

		return {
			data: data.map(mapProduct),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
		};
	}

	async function findById(id: string) {
		const product = await db.product.findFirst({
			where: { id, deletedAt: null },
			include: productInclude
		});
		return product ? mapProduct(product) : null;
	}

	async function findByCode(code: string) {
		const product = await db.product.findFirst({ where: { code, deletedAt: null } });
		return product;
	}

	async function create(input: ProductCreateInput) {
		const product = await db.product.create({
			data: input,
			include: productInclude
		});
		return mapProduct(product);
	}

	async function update(id: string, input: ProductUpdateInput) {
		const product = await db.product.update({
			where: { id },
			data: input,
			include: productInclude
		});
		return mapProduct(product);
	}

	async function remove(id: string) {
		await db.product.update({ where: { id }, data: { deletedAt: new Date() } });
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
	price: unknown;
	imageUrl?: string | null;
	preferredSupplierId?: string | null;
	preferredSupplier?: {
		id: string;
		name: string;
		type?: string | null;
		phone?: string | null;
		address?: string | null;
		status?: string | null;
	} | null;
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
		price: Number(p.price),
		imageUrl: p.imageUrl ?? null,
		preferredSupplierId: p.preferredSupplierId ?? null,
		preferredSupplier: p.preferredSupplier
			? ({
					id: p.preferredSupplier.id,
					name: p.preferredSupplier.name,
					type: p.preferredSupplier.type ?? 'GENERAL',
					phone: p.preferredSupplier.phone ?? null,
					address: p.preferredSupplier.address ?? null,
					status: (p.preferredSupplier.status as Supplier['status']) || 'ACTIVE'
				} satisfies Supplier)
			: null,
		status: p.status as ProductStatus,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString()
	};
}
