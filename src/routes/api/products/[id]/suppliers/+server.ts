import { json, error } from '@sveltejs/kit';
import { productService } from '$lib/server/services/product.service';
import { productSupplierService } from '$lib/server/services/productSupplier.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const product = await productService().getById(params.id);
		if (!product) throw error(404, { message: 'Product not found' });
		const suppliers = await productSupplierService().listForProduct(params.id);
		return json(suppliers);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load product suppliers' });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const body = await request.json();
		const result = await productSupplierService().link(params.id, String(body.supplierId ?? ''));
		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}
		const suppliers = await productSupplierService().listForProduct(params.id);
		return json(suppliers, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to add supplier' });
	}
};
