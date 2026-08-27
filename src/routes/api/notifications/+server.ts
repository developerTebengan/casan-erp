import { json, error } from '@sveltejs/kit';
import { notificationService } from '$lib/server/services/notification.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const unreadOnly = url.searchParams.get('unreadOnly') === '1';
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

		const service = notificationService();
		await service.ensureOverdueDeadlineNotifications(locals.user.id);

		const [notifications, counts] = await Promise.all([
			service.listForUser(locals.user.id, { unreadOnly, limit }),
			service.counts(locals.user.id)
		]);

		return json({ data: notifications, unreadCount: counts.unread, total: counts.total });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load notifications' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		if (body?.action === 'markAllRead') {
			const count = await notificationService().markAllRead(locals.user.id);
			return json({ success: true, count });
		}

		return json({ message: 'Unknown action' }, { status: 400 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to update notifications' });
	}
};
