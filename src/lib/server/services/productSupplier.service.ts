import { db } from '$lib/server/db';
import type { Supplier } from '$lib/types';

function mapProduct(row: { id: string; code: string; name: string }): { id: string; code: string; name: string } {
	return { id: row.id, code: row.code, name: row.name };
}

function mapSupplier(row: {
	id: string;
	name: string;
	type: string | null;
	phone: string | null;
	address: string | null;
}): Supplier {
	return {
		id: row.id,
		name: row.name,
		type: row.type ?? 'GENERAL',
		phone: row.phone,
		address: row.address
	};
}

export function productSupplierService() {
	async function listForProduct(productId: string): Promise<Supplier[]> {
		const rows = await db.productSupplier.findMany({
			where: { productId, supplier: { deletedAt: null } },
			include: { supplier: true },
			orderBy: { supplier: { name: 'asc' } }
		});
		return rows.map((row) => mapSupplier(row.supplier));
	}

	async function listForSupplier(supplierId: string): Promise<Array<{ id: string; code: string; name: string }>> {
		const rows = await db.productSupplier.findMany({
			where: { supplierId, product: { deletedAt: null } },
			include: { product: { select: { id: true, code: true, name: true } } },
			orderBy: { product: { name: 'asc' } }
		});
		return rows.map((row) => mapProduct(row.product));
	}

	async function link(productId: string, supplierId: string) {
		const product = await db.product.findFirst({ where: { id: productId, deletedAt: null } });
		if (!product) {
			return { success: false as const, errors: { productId: ['Product not found'] } };
		}
		const supplier = await db.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
		if (!supplier) {
			return { success: false as const, errors: { supplierId: ['Supplier not found'] } };
		}
		await db.productSupplier.upsert({
			where: { productId_supplierId: { productId, supplierId } },
			create: { productId, supplierId },
			update: {}
		});
		return { success: true as const };
	}

	async function unlink(productId: string, supplierId: string) {
		await db.productSupplier.deleteMany({ where: { productId, supplierId } });
		return { success: true as const };
	}

	return { listForProduct, listForSupplier, link, unlink };
}
