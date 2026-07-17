import { db } from '$lib/server/db';
import type { Supplier } from '$lib/types';

export function supplierRepository() {
	async function findAll(): Promise<Supplier[]> {
		const suppliers = await db.supplier.findMany({ orderBy: { name: 'asc' } });
		return suppliers.map((s) => ({
			id: s.id,
			name: s.name,
			phone: s.phone,
			address: s.address
		}));
	}

	async function findById(id: string): Promise<Supplier | null> {
		const supplier = await db.supplier.findUnique({ where: { id } });
		if (!supplier) return null;
		return {
			id: supplier.id,
			name: supplier.name,
			phone: supplier.phone,
			address: supplier.address
		};
	}

	return { findAll, findById };
}
