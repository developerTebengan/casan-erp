import { supplierService } from '$lib/server/services/supplier.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const service = supplierService();
	const [suppliers, typeCounts] = await Promise.all([
		service.list({ page: 1, limit: 10 }),
		service.typeCounts()
	]);
	return { suppliers, typeCounts };
};
