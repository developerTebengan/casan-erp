import { db } from '$lib/server/db';
import type { PaginatedResponse, Supplier } from '$lib/types';

export interface SupplierFilters {
	search?: string;
	type?: string;
	page?: number;
	limit?: number;
}

export interface SupplierCreateInput {
	name: string;
	type?: string;
	phone?: string;
	address?: string;
}

export interface SupplierUpdateInput {
	name: string;
	type?: string;
	phone?: string;
	address?: string;
}

export function supplierRepository() {
	async function findAll(): Promise<Supplier[]> {
		const suppliers = await db.supplier.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		});
		return suppliers.map(mapSupplier);
	}

	async function findMany(filters: SupplierFilters = {}): Promise<PaginatedResponse<Supplier>> {
		const { search, type, page = 1, limit = 10 } = filters;

		const where: Record<string, unknown> = { deletedAt: null };
		if (type) where.type = type;
		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ phone: { contains: search, mode: 'insensitive' } },
				{ address: { contains: search, mode: 'insensitive' } },
				{ type: { contains: search, mode: 'insensitive' } }
			];
		}

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			db.supplier.findMany({
				where,
				skip,
				take: limit,
				orderBy: { name: 'asc' }
			}),
			db.supplier.count({ where })
		]);

		return {
			data: data.map(mapSupplier),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
		};
	}

	async function findById(id: string): Promise<Supplier | null> {
		const supplier = await db.supplier.findFirst({ where: { id, deletedAt: null } });
		if (!supplier) return null;
		return mapSupplier(supplier);
	}

	async function findByName(name: string): Promise<Supplier | null> {
		const supplier = await db.supplier.findFirst({
			where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null }
		});
		return supplier ? mapSupplier(supplier) : null;
	}

	async function create(input: SupplierCreateInput): Promise<Supplier> {
		const supplier = await db.supplier.create({
			data: {
				name: input.name,
				type: input.type || 'GENERAL',
				phone: input.phone,
				address: input.address
			}
		});
		return mapSupplier(supplier);
	}

	async function update(id: string, input: SupplierUpdateInput): Promise<Supplier> {
		const supplier = await db.supplier.update({
			where: { id },
			data: {
				name: input.name,
				type: input.type || 'GENERAL',
				phone: input.phone,
				address: input.address
			}
		});
		return mapSupplier(supplier);
	}

	async function remove(id: string): Promise<void> {
		await db.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	return { findAll, findMany, findById, findByName, create, update, remove };
}

function mapSupplier(s: {
	id: string;
	name: string;
	type?: string | null;
	phone: string | null;
	address: string | null;
}): Supplier {
	return {
		id: s.id,
		name: s.name,
		type: s.type ?? 'GENERAL',
		phone: s.phone,
		address: s.address
	};
}
