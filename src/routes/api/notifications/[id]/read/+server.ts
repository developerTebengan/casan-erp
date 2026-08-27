import { json, error } from '@sveltejs/kit';
import { notificationService } from '$lib/server/services/notification.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const notification = await notificationService().markRead(params.id, locals.user.id);
		if (!notification) {
			return json({ message: 'Notification not found' }, { status: 404 });
		}

		return json(notification);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to mark notification as read' });
	}
};
