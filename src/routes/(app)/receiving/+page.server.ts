import { requirePermission } from '$lib/server/auth';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'purchasing:receive');
	const ready = await goodsReceiptService().listReadyToReceive();
	return { ready };
};
