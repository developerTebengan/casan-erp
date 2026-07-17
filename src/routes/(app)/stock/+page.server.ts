import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { productRepository } from '$lib/server/repositories/product.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const txService = stockTransactionService();
	const productRepo = productRepository();

	const [transactions, products] = await Promise.all([
		txService.list({ page: 1, limit: 10 }),
		productRepo.findAll({ limit: 1000 })
	]);

	return { transactions, products: products.data };
};
