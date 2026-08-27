import { db } from '$lib/server/db';
import type { Warehouse } from '$lib/types';

export interface WarehouseCreateInput {
	code: string;
	name: string;
	isDefault?: boolean;
}

export interface WarehouseUpdateInput {
	code: string;
	name: string;
	isDefault?: boolean;
}

export function warehouseRepository() {
	async function findAll(): Promise<Warehouse[]> {
		const warehouses = await db.warehouse.findMany({
			where: { deletedAt: null },
			orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
		});
		return warehouses.map(mapWarehouse);
	}

	async function findById(id: string): Promise<Warehouse | null> {
		const warehouse = await db.warehouse.findFirst({ where: { id, deletedAt: null } });
		return warehouse ? mapWarehouse(warehouse) : null;
	}

	async function findByCode(code: string): Promise<Warehouse | null> {
		const warehouse = await db.warehouse.findFirst({
			where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null }
		});
		return warehouse ? mapWarehouse(warehouse) : null;
	}

	async function findDefault(): Promise<Warehouse | null> {
		const warehouse = await db.warehouse.findFirst({
			where: { isDefault: true, deletedAt: null }
		});
		return warehouse ? mapWarehouse(warehouse) : null;
	}

	async function create(input: WarehouseCreateInput): Promise<Warehouse> {
		const warehouse = await db.warehouse.create({
			data: {
				code: input.code,
				name: input.name,
				isDefault: input.isDefault ?? false
			}
		});
		return mapWarehouse(warehouse);
	}

	async function update(id: string, input: WarehouseUpdateInput): Promise<Warehouse> {
		const warehouse = await db.warehouse.update({
			where: { id },
			data: {
				code: input.code,
				name: input.name,
				isDefault: input.isDefault ?? false
			}
		});
		return mapWarehouse(warehouse);
	}

	async function clearDefaultExcept(id?: string): Promise<void> {
		await db.warehouse.updateMany({
			where: {
				deletedAt: null,
				isDefault: true,
				...(id ? { NOT: { id } } : {})
			},
			data: { isDefault: false }
		});
	}

	async function remove(id: string): Promise<void> {
		await db.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	async function countReferences(id: string): Promise<number> {
		const [stocks, txs, counts, receipts] = await Promise.all([
			db.productStock.count({ where: { warehouseId: id } }),
			db.stockTransaction.count({ where: { warehouseId: id, deletedAt: null } }),
			db.cycleCount.count({ where: { warehouseId: id, deletedAt: null } }),
			db.goodsReceipt.count({ where: { warehouseId: id, deletedAt: null } })
		]);
		return stocks + txs + counts + receipts;
	}

	return {
		findAll,
		findById,
		findByCode,
		findDefault,
		create,
		update,
		clearDefaultExcept,
		remove,
		countReferences
	};
}

function mapWarehouse(w: {
	id: string;
	code: string;
	name: string;
	isDefault: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}): Warehouse {
	return {
		id: w.id,
		code: w.code,
		name: w.name,
		isDefault: w.isDefault,
		createdAt: w.createdAt?.toISOString(),
		updatedAt: w.updatedAt?.toISOString()
	};
}
