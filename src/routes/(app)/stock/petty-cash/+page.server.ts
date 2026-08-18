import { requirePermission } from '$lib/server/auth';
import { productRepository } from '$lib/server/repositories/product.repository';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'stock:write');
	const [products, balance] = await Promise.all([
		productRepository().findAll({ limit: 1000, status: 'ACTIVE' }),
		pettyCashService().getBalance()
	]);
	return { products: products.data, balance };
};
