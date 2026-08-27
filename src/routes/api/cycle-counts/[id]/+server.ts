import { json, error } from '@sveltejs/kit';
import { cycleCountService } from '$lib/server/services/cycleCount.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const data = await cycleCountService().getById(params.id);
		if (!data) return json({ message: 'Not found' }, { status: 404 });
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load cycle count' });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await cycleCountService().updateDraft(params.id, {
			note: body.note,
			lines: body.lines
		});

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to update cycle count' });
	}
};
