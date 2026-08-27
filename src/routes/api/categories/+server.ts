import { json, error } from '@sveltejs/kit';
import { categoryService } from '$lib/server/services/category.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (
			!locals.user ||
			(!hasPermission(locals.user.role, 'categories:manage') &&
				!hasPermission(locals.user.role, 'inventory:view'))
		) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const categories = await categoryService().list();
		return json(categories);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load categories' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'categories:manage')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await categoryService().create(body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create category' });
	}
};
