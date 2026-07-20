import { purchaseService } from '$lib/server/services/purchase.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const purchase = await purchaseService().getById(params.id);
	if (!purchase) throw error(404, 'Purchasing request not found');
	return { purchase };
};
