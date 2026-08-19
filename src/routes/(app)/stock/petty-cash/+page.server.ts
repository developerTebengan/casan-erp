import { requirePermission } from '$lib/server/auth';
import { productRepository } from '$lib/server/repositories/product.repository';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'stock:write');
	const [products, suppliers, balance] = await Promise.all([
		productRepository().findAll({ limit: 1000, status: 'ACTIVE' }),
		supplierRepository().findAll(),
		pettyCashService().getBalance()
	]);
	return { products: products.data, suppliers, balance };
};
