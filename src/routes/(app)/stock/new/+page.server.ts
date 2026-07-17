import { productRepository } from '$lib/server/repositories/product.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const productRepo = productRepository();
	const products = await productRepo.findAll({ limit: 1000 });
	return { products: products.data };
};
