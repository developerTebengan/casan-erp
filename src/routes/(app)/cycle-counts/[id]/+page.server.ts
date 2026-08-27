import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/auth';
import { cycleCountService } from '$lib/server/services/cycleCount.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	await requirePermission(cookies, 'stock:write');
	const cycleCount = await cycleCountService().getById(params.id);
	if (!cycleCount) throw error(404, 'Cycle count not found');
	return { cycleCount };
};
