import { productService } from '$lib/server/services/product.service';
import { categoryRepository } from '$lib/server/repositories/category.repository';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [product, categories, suppliers] = await Promise.all([
		productService().getById(params.id),
		categoryRepository().findAll(),
		supplierRepository().findAll()
	]);

	if (!product) throw error(404, 'Product not found');
	return { product, categories, suppliers };
};
