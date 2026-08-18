import { requirePermission } from '$lib/server/auth';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const user = await requirePermission(cookies, 'pettyCash:view');
	const summary = await pettyCashService().list({ type: 'REFUND', page: 1, limit: 20 });
	return { user, summary };
};
