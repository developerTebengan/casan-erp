import { json, error } from '@sveltejs/kit';
import { userService } from '$lib/server/services/user.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const service = userService();
		const users = await service.list();
		return json(users);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load users' });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
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
