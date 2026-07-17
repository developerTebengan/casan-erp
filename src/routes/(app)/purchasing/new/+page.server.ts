import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { productService } from '$lib/server/services/product.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [suppliers, products] = await Promise.all([
		supplierRepository().findAll(),
		productService().list({ page: 1, limit: 100, status: 'ACTIVE' })
	]);

	return { suppliers, products: products.data };
};
