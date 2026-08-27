import { requirePermission } from '$lib/server/auth';
import { cycleCountService } from '$lib/server/services/cycleCount.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'stock:write');
	const cycleCounts = await cycleCountService().list();
	return { cycleCounts };
};
