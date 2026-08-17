import { requireAuth } from '$lib/server/auth';
import { notificationService } from '$lib/server/services/notification.service';
import { purchaseService } from '$lib/server/services/purchase.service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const user = await requireAuth(cookies);
	const [unreadCount, waiting] = await Promise.all([
		notificationService().countUnread(user.id),
		purchaseService().list({ awaitingApproverId: user.id, page: 1, limit: 1 })
	]);
	return { user, unreadCount, waitingCount: waiting.pagination.total };
};
