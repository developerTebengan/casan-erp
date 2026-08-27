import { productRepository } from '$lib/server/repositories/product.repository';
import { warehouseService } from '$lib/server/services/warehouse.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const productRepo = productRepository();
	const products = await productRepo.findAll({ limit: 1000 });
	const warehouses = await warehouseService().list();
	return { products: products.data, warehouses };
};
