import { supplierService } from '$lib/server/services/supplier.service';
import { productService } from '$lib/server/services/product.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const service = supplierService();
	const [suppliers, typeCounts, products] = await Promise.all([
		service.list({ page: 1, limit: 10 }),
		service.typeCounts(),
		productService().list({ page: 1, limit: 500, status: 'ACTIVE' })
	]);
	return { suppliers, typeCounts, products: products.data };
};
