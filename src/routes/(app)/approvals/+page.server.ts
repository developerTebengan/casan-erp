import { requirePermission } from '$lib/server/auth';
import { purchaseService } from '$lib/server/services/purchase.service';
import type { PageServerLoad } from './$types';

function monthBounds(month: string | null): { from?: string; to?: string; month: string } {
	const now = new Date();
	const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const value = month && /^\d{4}-\d{2}$/.test(month) ? month : fallback;
	const [y, m] = value.split('-').map(Number);
	const from = new Date(y, m - 1, 1);
	const to = new Date(y, m, 0, 23, 59, 59, 999);
	return {
		month: value,
		from: from.toISOString(),
		to: to.toISOString()
	};
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const user = await requirePermission(cookies, 'approvals:view');
	const tabParam = url.searchParams.get('tab');
	const tab =
		tabParam === 'approved' || tabParam === 'rejected' || tabParam === 'waiting'
			? tabParam
			: 'waiting';

	const bounds = monthBounds(url.searchParams.get('month'));
	const useMonth = tab !== 'waiting';

	const decisionMap = {
		waiting: 'PENDING',
		approved: 'APPROVED',
		rejected: 'REJECTED'
	} as const;

	const service = purchaseService();
	const [purchases, waitingCount, approvedMonth, rejectedMonth] = await Promise.all([
		service.list({
			myApproverId: user.id,
			myDecision: decisionMap[tab],
			decidedAfter: useMonth ? bounds.from : undefined,
			decidedBefore: useMonth ? bounds.to : undefined,
			page: 1,
			limit: 100
		}),
		service.list({ myApproverId: user.id, myDecision: 'PENDING', page: 1, limit: 1 }),
		service.list({
			myApproverId: user.id,
			myDecision: 'APPROVED',
			decidedAfter: bounds.from,
			decidedBefore: bounds.to,
			page: 1,
			limit: 1
		}),
		service.list({
			myApproverId: user.id,
			myDecision: 'REJECTED',
			decidedAfter: bounds.from,
			decidedBefore: bounds.to,
			page: 1,
			limit: 1
		})
	]);

	const allApproved = await service.list({
		myApproverId: user.id,
		myDecision: 'APPROVED',
		page: 1,
		limit: 1
	});
	const allRejected = await service.list({
		myApproverId: user.id,
		myDecision: 'REJECTED',
		page: 1,
		limit: 1
	});

	return {
		purchases,
		user,
		tab,
		month: bounds.month,
		counts: {
			waiting: waitingCount.pagination.total,
			approved: allApproved.pagination.total,
			rejected: allRejected.pagination.total
		},
		monthStats: {
			approved: approvedMonth.pagination.total,
			rejected: rejectedMonth.pagination.total,
			total: approvedMonth.pagination.total + rejectedMonth.pagination.total
		}
	};
};
