import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import type { RecentActivity } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const [totalProducts, totalPurchaseOrders, totalSuppliers, products, purchases] =
			await Promise.all([
				db.product.count({ where: { deletedAt: null } }),
				db.purchase.count({ where: { deletedAt: null } }),
				db.supplier.count({ where: { deletedAt: null } }),
				db.product.findMany({
					where: { deletedAt: null },
					select: { id: true, stock: true, minimumStock: true }
				}),
				db.purchase.findMany({
					where: { deletedAt: null },
					orderBy: { createdAt: 'desc' },
					take: 10,
					include: { supplier: { select: { name: true } } }
				})
			]);

		const lowStockItems = products.filter((p) => p.stock <= p.minimumStock).length;

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

		const latestProducts = await db.product.findMany({
			where: { deletedAt: null },
			orderBy: { createdAt: 'desc' },
			take: 5,
			include: { category: { select: { name: true } } }
		});

		for (const p of latestProducts) {
			recentActivities.push({
				id: p.id,
				description: `Product ${p.name} added to ${p.category.name}`,
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
				lowStockItems
			},
			monthlyPurchases,
			recentActivities: recentActivities.slice(0, 10)
		});
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load dashboard data' });
	}
};
