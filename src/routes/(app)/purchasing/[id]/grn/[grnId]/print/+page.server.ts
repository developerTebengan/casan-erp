import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';
import { hasPermission } from '$lib/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const user = await requireAuth(cookies);
	if (
		!hasPermission(user.role, 'purchasing:view') &&
		!hasPermission(user.role, 'purchasing:receive')
	) {
		throw error(403, 'Forbidden');
	}

	const receipt = await goodsReceiptService().getById(params.grnId);
	if (!receipt || receipt.purchaseId !== params.id) {
		throw error(404, 'Goods receipt not found');
	}

	return { receipt };
};
