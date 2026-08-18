import { json, error } from '@sveltejs/kit';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (
			!locals.user ||
			!hasPermission(locals.user.role, 'stock:write') ||
			!hasPermission(locals.user.role, 'pettyCash:write')
		) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const body = await request.json();
		const result = await pettyCashService().buyStock(body, locals.user.id);
		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}
		return json(result.data, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to buy stock with petty cash' });
	}
};
