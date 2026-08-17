import { json, error } from '@sveltejs/kit';
import { productService } from '$lib/server/services/product.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const service = productService();
		const product = await service.getById(params.id);
		if (!product) throw error(404, { message: 'Product not found' });
		return json(product);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load product' });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const service = productService();
		const result = await service.update(params.id, body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to update product' });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const service = productService();
		const result = await service.remove(params.id);

		if (!result.success) {
			return json({ message: 'Failed to delete product', errors: result.errors }, { status: 400 });
		}

		return json({ success: true });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to delete product' });
	}
};
