import { purchaseService } from '$lib/server/services/purchase.service';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const service = purchaseService();
	const [purchases, suppliers, statusCounts] = await Promise.all([
		service.list({ page: 1, limit: 10, approvalStatus: 'PENDING' }),
		supplierRepository().findAll(),
		service.statusCounts()
	]);

	return { purchases, suppliers, statusCounts, initialStatus: 'PENDING' };
};
