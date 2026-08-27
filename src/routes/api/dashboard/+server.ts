import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { purchaseService } from '$lib/server/services/purchase.service';
import { notificationService } from '$lib/server/services/notification.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';
import type {
	CategoryStockStat,
	DashboardProductRow,
	RecentActivity
} from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		let unreadNotifications = 0;
		if (user) {
			const notif = notificationService();
			await notif.ensureOverdueDeadlineNotifications(user.id);
			const counts = await notif.counts(user.id);
			unreadNotifications = counts.unread;
		}

		const [totalProducts, totalPurchaseOrders, totalSuppliers, products, purchases, categories] =
			await Promise.all([
				db.product.count({ where: { deletedAt: null } }),
				db.purchase.count({ where: { deletedAt: null } }),
				db.supplier.count({ where: { deletedAt: null } }),
				db.product.findMany({
					where: { deletedAt: null },
					include: { category: { select: { id: true, name: true } } },
					orderBy: { name: 'asc' }
				}),
				db.purchase.findMany({
					where: { deletedAt: null },
					orderBy: { createdAt: 'desc' },
					take: 10,
					include: { supplier: { select: { name: true } } }
				}),
				db.category.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
			]);

		const lowStockItems = products.filter((p) => p.stock <= p.minimumStock).length;

		let pendingApprovals = 0;
		if (user && hasPermission(user.role, 'approvals:view')) {
			const inbox = await purchaseService().list({
				awaitingApproverId: user.id,
				page: 1,
				limit: 1
			});
			pendingApprovals = inbox.pagination.total;
		}

		const categoryStock: CategoryStockStat[] = categories.map((cat) => {
			const catProducts = products.filter((p) => p.categoryId === cat.id);
			return {
				categoryId: cat.id,
				categoryName: cat.name,
				productCount: catProducts.length,
				totalStock: catProducts.reduce((sum, p) => sum + p.stock, 0),
				lowStockCount: catProducts.filter((p) => p.stock <= p.minimumStock).length,
				inventoryValue: catProducts.reduce((sum, p) => sum + p.stock * Number(p.price), 0)
			};
		});

		const productsByCategory: DashboardProductRow[] = products.slice(0, 20).map((p) => ({
			id: p.id,
			code: p.code,
			name: p.name,
			categoryName: p.category?.name ?? '-',
			stock: p.stock,
			minimumStock: p.minimumStock,
			unit: p.unit,
			imageUrl: p.imageUrl
		}));

		const monthlyMap = new Map<string, number>();
		const allPurchases = await db.purchase.findMany({
			where: { deletedAt: null },
			select: { dateOfRequest: true, total: true }
		});

		for (const p of allPurchases) {
			const key = new Date(p.dateOfRequest).toLocaleString('en-US', {
				month: 'short',
				year: 'numeric'
			});
			monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(p.total));
		}

		const monthlyPurchases = Array.from(monthlyMap.entries())
			.map(([month, total]) => ({ month, total }))
			.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
			.slice(-12);

		const recentActivities: RecentActivity[] = purchases.map((p) => ({
			id: p.id,
			description: `Purchasing request ${p.prNumber} created with ${p.supplier?.name ?? 'no supplier'}`,
			date: p.createdAt.toISOString(),
			type: 'PURCHASE' as const
		}));

		const latestProducts = products
			.slice()
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
			.slice(0, 5);

		for (const p of latestProducts) {
			recentActivities.push({
				id: p.id,
				description: `Product ${p.name} added to ${p.category?.name ?? 'category'}`,
				date: p.createdAt.toISOString(),
				type: 'PRODUCT' as const
			});
		}

		recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return json({
			stats: {
				totalProducts,
				totalPurchaseOrders,
				totalSuppliers,
				lowStockItems,
				pendingApprovals,
				unreadNotifications
			},
			monthlyPurchases,
			recentActivities: recentActivities.slice(0, 10),
			categoryStock,
			productsByCategory
		});
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load dashboard data' });
	}
};
