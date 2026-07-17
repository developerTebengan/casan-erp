import { purchaseService } from '$lib/server/services/purchase.service';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [purchases, suppliers] = await Promise.all([
		purchaseService().list({ page: 1, limit: 10 }),
		supplierRepository().findAll()
	]);

	return { purchases, suppliers };
};
