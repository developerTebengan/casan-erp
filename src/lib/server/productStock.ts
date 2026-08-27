import { db } from '$lib/server/db';

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Get warehouse qty for a product; falls back to product.stock when no ProductStock row. */
export async function getWarehouseQty(
	tx: TxClient,
	productId: string,
	warehouseId: string | null | undefined,
	fallbackStock: number
): Promise<number> {
	if (!warehouseId) return fallbackStock;
	const row = await tx.productStock.findUnique({
		where: { productId_warehouseId: { productId, warehouseId } }
	});
	return row?.qty ?? fallbackStock;
}

/** Set absolute qty for product+warehouse (upsert). */
export async function setProductStockQty(
	tx: TxClient,
	productId: string,
	warehouseId: string,
	qty: number
): Promise<void> {
	await tx.productStock.upsert({
		where: { productId_warehouseId: { productId, warehouseId } },
		create: { productId, warehouseId, qty },
		update: { qty }
	});
}

/** Apply a signed delta to product+warehouse qty (creates row if missing). */
export async function applyProductStockDelta(
	tx: TxClient,
	productId: string,
	warehouseId: string,
	delta: number,
	fallbackStock: number
): Promise<number> {
	const current = await getWarehouseQty(tx, productId, warehouseId, fallbackStock);
	const next = current + delta;
	await setProductStockQty(tx, productId, warehouseId, next);
	return next;
}
