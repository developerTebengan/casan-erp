import { json, error } from '@sveltejs/kit';
import { warehouseService } from '$lib/server/services/warehouse.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (
			!locals.user ||
			(!hasPermission(locals.user.role, 'warehouses:view') &&
				!hasPermission(locals.user.role, 'stock:view') &&
				!hasPermission(locals.user.role, 'purchasing:receive'))
		) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const warehouses = await warehouseService().list();
		return json(warehouses);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load warehouses' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'warehouses:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await warehouseService().create(body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create warehouse' });
	}
};
