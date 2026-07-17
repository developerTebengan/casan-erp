import { productService } from '$lib/server/services/product.service';
import { categoryRepository } from '$lib/server/repositories/category.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const service = productService();
	const categoryRepo = categoryRepository();

	const [products, categories] = await Promise.all([
		service.list({ page: 1, limit: 10 }),
		categoryRepo.findAll()
	]);

	return { products, categories };
};
