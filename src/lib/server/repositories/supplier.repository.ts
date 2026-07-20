import { db } from '$lib/server/db';
import type { Supplier } from '$lib/types';

export interface SupplierCreateInput {
	name: string;
	phone?: string;
	address?: string;
}

export interface SupplierUpdateInput {
	name: string;
	phone?: string;
	address?: string;
}

export function supplierRepository() {
	async function findAll(): Promise<Supplier[]> {
		const suppliers = await db.supplier.findMany({ orderBy: { name: 'asc' } });
		return suppliers.map(mapSupplier);
	}

	async function findById(id: string): Promise<Supplier | null> {
		const supplier = await db.supplier.findUnique({ where: { id } });
		if (!supplier) return null;
		return mapSupplier(supplier);
	}

	async function findByName(name: string): Promise<Supplier | null> {
		const supplier = await db.supplier.findFirst({
			where: { name: { equals: name, mode: 'insensitive' } }
		});
		return supplier ? mapSupplier(supplier) : null;
	}

	async function create(input: SupplierCreateInput): Promise<Supplier> {
		const supplier = await db.supplier.create({
			data: {
				name: input.name,
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
				phone: input.phone,
				address: input.address
			}
		});
		return mapSupplier(supplier);
	}

	async function remove(id: string): Promise<void> {
		await db.supplier.delete({ where: { id } });
	}

	return { findAll, findById, findByName, create, update, remove };
}

function mapSupplier(s: {
	id: string;
	name: string;
	phone: string | null;
	address: string | null;
}): Supplier {
	return {
		id: s.id,
		name: s.name,
		phone: s.phone,
		address: s.address
	};
}
