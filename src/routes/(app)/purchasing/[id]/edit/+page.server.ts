import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { purchaseService } from '$lib/server/services/purchase.service';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { productService } from '$lib/server/services/product.service';
import { userService } from '$lib/server/services/user.service';
import { hasPermission } from '$lib/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const user = await requireAuth(cookies);
	if (!hasPermission(user.role, 'purchasing:write')) {
		throw error(403, 'Forbidden');
	}

	const purchase = await purchaseService().getById(params.id);
	if (!purchase) throw error(404, 'Purchasing request not found');

	if (purchase.approvalStatus !== 'PENDING' && purchase.approvalStatus !== 'REJECTED') {
		throw error(400, 'Only pending or rejected purchasing requests can be edited');
	}

	const [suppliers, productsResult, users] = await Promise.all([
		supplierRepository().findAll(),
		productService().list({ page: 1, limit: 500, status: 'ACTIVE' }),
		userService().list()
	]);

	return {
		purchase,
		suppliers,
		products: productsResult.data,
		users
	};
};
