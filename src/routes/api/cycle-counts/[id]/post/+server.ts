import { json, error } from '@sveltejs/kit';
import { cycleCountService } from '$lib/server/services/cycleCount.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const result = await cycleCountService().post(params.id, locals.user.id);

		if (!result.success) {
			return json({ message: 'Failed to post', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to post cycle count' });
	}
};
