import { json, error } from '@sveltejs/kit';
import { cycleCountService } from '$lib/server/services/cycleCount.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const data = await cycleCountService().list();
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load cycle counts' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await cycleCountService().create(
			{
				warehouseId: body.warehouseId,
				note: body.note,
				lines: body.lines ?? []
			},
			locals.user.id
		);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create cycle count' });
	}
};
