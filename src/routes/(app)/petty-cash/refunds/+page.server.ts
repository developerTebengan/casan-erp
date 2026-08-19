import { requirePermission } from '$lib/server/auth';
import { refundRequestService } from '$lib/server/services/refundRequest.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const user = await requirePermission(cookies, 'pettyCash:view');
	const queue = await refundRequestService().listQueue({ tab: 'pending', page: 1, limit: 20 });
	return { user, queue };
};
