import { requirePermission } from '$lib/server/auth';
import { warehouseService } from '$lib/server/services/warehouse.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'warehouses:view');
	const warehouses = await warehouseService().list();
	return { warehouses };
};
