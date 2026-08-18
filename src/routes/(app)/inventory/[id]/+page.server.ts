import { productService } from '$lib/server/services/product.service';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [product, history, suppliers] = await Promise.all([
		productService().getById(params.id),
		stockTransactionService().list({ productId: params.id, limit: 10 }),
		supplierRepository().findAll()
	]);
	if (!product) throw error(404, 'Product not found');
	return { product, history: history.data, suppliers };
};
