import { json, error } from '@sveltejs/kit';
import { productSupplierService } from '$lib/server/services/productSupplier.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		await productSupplierService().unlink(params.id, params.supplierId);
		return json({ success: true });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to remove supplier' });
	}
};
