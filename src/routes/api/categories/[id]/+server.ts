import { json, error } from '@sveltejs/kit';
import { categoryService } from '$lib/server/services/category.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'categories:manage')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await categoryService().update(params.id, body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to update category' });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'categories:manage')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const result = await categoryService().remove(params.id);

		if (!result.success) {
			return json({ message: 'Failed to delete category', errors: result.errors }, { status: 400 });
		}

		return json({ success: true });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to delete category' });
	}
};
