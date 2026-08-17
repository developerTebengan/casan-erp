import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { productService } from '$lib/server/services/product.service';
import { userService } from '$lib/server/services/user.service';
import type { PageServerLoad } from './$types';
import type { PurchaseItem } from '$lib/types';

export const load: PageServerLoad = async ({ url }) => {
	const fromLowStock = url.searchParams.get('fromLowStock') === '1';

	const [suppliers, productsResult, users, lowStockResult] = await Promise.all([
		supplierRepository().findAll(),
		productService().list({ page: 1, limit: 500, status: 'ACTIVE' }),
		userService().list(),
		fromLowStock
			? productService().list({ page: 1, limit: 100, status: 'ACTIVE', lowStock: true })
			: Promise.resolve(null)
	]);

	const products = productsResult.data;
	let initialItems: PurchaseItem[] | undefined;

	if (fromLowStock && lowStockResult) {
		initialItems = lowStockResult.data.map((p) => {
			const deficit = Math.max(1, p.minimumStock - p.stock);
			return {
				id: '',
				purchaseId: '',
				productId: p.id,
				product: p,
				qty: deficit,
				price: p.price,
				subtotal: deficit * p.price,
				notes: `Auto from low stock (on hand ${p.stock}, min ${p.minimumStock})`
			};
		});
	}

	return {
		suppliers,
		products,
		users,
		fromLowStock,
		initialPurchase: initialItems?.length
			? {
					purpose: 'Restock',
					department: '',
					items: initialItems
				}
			: undefined
	};
};
