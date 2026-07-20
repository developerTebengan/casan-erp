import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { productService } from '$lib/server/services/product.service';
import { userService } from '$lib/server/services/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [suppliers, products, users] = await Promise.all([
		supplierRepository().findAll(),
		productService().list({ page: 1, limit: 100, status: 'ACTIVE' }),
		userService().list()
	]);

	return { suppliers, products: products.data, users };
};
