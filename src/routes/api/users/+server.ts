import { json, error } from '@sveltejs/kit';
import { userService } from '$lib/server/services/user.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Approvers list for PR form needs users; ADMIN manages; others with purchasing:write can list
		if (
			!locals.user ||
			(!hasPermission(locals.user.role, 'users:manage') &&
				!hasPermission(locals.user.role, 'purchasing:write'))
		) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const service = userService();
		const users = await service.list();
		return json(users);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load users' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'users:manage')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const service = userService();
		const result = await service.create(body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create user' });
	}
};
