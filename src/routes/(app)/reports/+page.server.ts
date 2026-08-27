import { requirePermission } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'reports:view');
	const today = new Date();
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(today.getDate() - 30);
	const toYmd = (d: Date) => d.toISOString().slice(0, 10);
	return {
		defaultFrom: toYmd(thirtyDaysAgo),
		defaultTo: toYmd(today)
	};
};
