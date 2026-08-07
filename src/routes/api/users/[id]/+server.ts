import { json, error } from '@sveltejs/kit';
import { userService } from '$lib/server/services/user.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (
			!locals.user ||
			(!hasPermission(locals.user.role, 'users:manage') &&
				!hasPermission(locals.user.role, 'purchasing:write'))
		) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const service = userService();
		const user = await service.getById(params.id);
		if (!user) throw error(404, { message: 'User not found' });
		return json(user);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load user' });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'users:manage')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const service = userService();
		const result = await service.update(params.id, body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to update user' });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'users:manage')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const service = userService();
		const result = await service.remove(params.id);

		if (!result.success) {
			return json({ message: 'Failed to delete user', errors: result.errors }, { status: 400 });
		}

		return json({ success: true });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to delete user' });
	}
};
