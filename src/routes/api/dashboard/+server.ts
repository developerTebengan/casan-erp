import { json, error } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/services/purchase.service';
import { productService } from '$lib/server/services/product.service';
import type { RequestHandler } from './$types';
import type { DashboardData, DashboardProductRow, Product } from '$lib/types';
import { homeFor, sortQueueOverdueFirst } from '$lib/dashboard/home';

function toLowStockRow(product: Product): DashboardProductRow {
	return {
		id: product.id,
		code: product.code,
		name: product.name,
		categoryName: product.category?.name ?? '-',
		stock: product.stock,
		minimumStock: product.minimumStock,
		unit: product.unit,
		imageUrl: product.imageUrl
	};
}

function emptyHome(): Omit<DashboardData, 'home' | 'stats'> {
	return {
		queue: [],
		mine: [],
		lowStockProducts: [],
		recentPurchases: []
	};
}

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const home = homeFor(user.role);
		const purchases = purchaseService();
		const products = productService();

		if (home === 'queue') {
			const [inbox, lowStock] = await Promise.all([
				purchases.list({ awaitingApproverId: user.id, page: 1, limit: 20 }),
				products.list({ lowStock: true, page: 1, limit: 1 })
			]);
			const payload: DashboardData = {
				home,
				stats: {
					lowStockItems: lowStock.pagination.total,
					pendingApprovals: inbox.pagination.total,
					pendingPurchases: 0
				},
				...emptyHome(),
				queue: sortQueueOverdueFirst(inbox.data)
			};
			return json(payload);
		}

		if (home === 'mine') {
			const [mine, lowStock] = await Promise.all([
				purchases.list({ requesterId: user.id, page: 1, limit: 10 }),
				products.list({ lowStock: true, page: 1, limit: 10 })
			]);
			const payload: DashboardData = {
				home,
				stats: {
					lowStockItems: lowStock.pagination.total,
					pendingApprovals: 0,
					pendingPurchases: 0
				},
				...emptyHome(),
				mine: mine.data,
				lowStockProducts: lowStock.data.map(toLowStockRow)
			};
			return json(payload);
		}

		const [lowStock, pending, recent] = await Promise.all([
			products.list({ lowStock: true, page: 1, limit: 1 }),
			purchases.list({ approvalStatus: 'PENDING', page: 1, limit: 1 }),
			purchases.list({ page: 1, limit: 10 })
		]);
		const payload: DashboardData = {
			home,
			stats: {
				lowStockItems: lowStock.pagination.total,
				pendingApprovals: 0,
				pendingPurchases: pending.pagination.total
			},
			...emptyHome(),
			recentPurchases: recent.data
		};
		return json(payload);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load dashboard data' });
	}
};
