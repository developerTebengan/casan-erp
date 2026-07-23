import { supplierService } from '$lib/server/services/supplier.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const suppliers = await supplierService().list({ page: 1, limit: 10 });
	return { suppliers };
};
