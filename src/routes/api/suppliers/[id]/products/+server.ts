import { json, error } from '@sveltejs/kit';
import { supplierService } from '$lib/server/services/supplier.service';
import { productSupplierService } from '$lib/server/services/productSupplier.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'suppliers:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const supplier = await supplierService().getById(params.id);
		if (!supplier) throw error(404, { message: 'Supplier not found' });
		const products = await productSupplierService().listForSupplier(params.id);
		return json(products);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load supplier products' });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'suppliers:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const body = await request.json();
		const result = await productSupplierService().link(String(body.productId ?? ''), params.id);
		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}
		const products = await productSupplierService().listForSupplier(params.id);
		return json(products, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to add product' });
	}
};
