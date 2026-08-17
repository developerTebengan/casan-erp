import { json, error } from '@sveltejs/kit';
import { notificationService } from '$lib/server/services/notification.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const notifications = await notificationService().listForUser(locals.user.id);
		return json(notifications);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load notifications' });
	}
};
