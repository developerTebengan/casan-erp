import { json, error } from '@sveltejs/kit';
import { supplierService } from '$lib/server/services/supplier.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const service = supplierService();
		const supplier = await service.getById(params.id);
		if (!supplier) throw error(404, { message: 'Supplier not found' });
		return json(supplier);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load supplier' });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'suppliers:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const service = supplierService();
		const result = await service.update(params.id, body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to update supplier' });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'suppliers:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const service = supplierService();
		const result = await service.remove(params.id);

		if (!result.success) {
			return json({ message: 'Failed to delete supplier', errors: result.errors }, { status: 400 });
		}

		return json({ success: true });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to delete supplier' });
	}
};
