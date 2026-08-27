import { requirePermission } from '$lib/server/auth';
import { warehouseService } from '$lib/server/services/warehouse.service';
import { productRepository } from '$lib/server/repositories/product.repository';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'stock:write');
	const warehouses = await warehouseService().list();
	const productsResult = await productRepository().findAll({ status: 'ACTIVE', limit: 1000 });

	const defaultWh = warehouses.find((w) => w.isDefault) ?? warehouses[0];
	const productStocks =
		defaultWh
			? await db.productStock.findMany({
					where: { warehouseId: defaultWh.id },
					select: { productId: true, qty: true }
				})
			: [];
	const stockByProduct = Object.fromEntries(productStocks.map((ps) => [ps.productId, ps.qty]));

	const products = productsResult.data.map((p) => ({
		...p,
		warehouseQty: stockByProduct[p.id] ?? p.stock
	}));

	return { warehouses, products, defaultWarehouseId: defaultWh?.id ?? '' };
};
