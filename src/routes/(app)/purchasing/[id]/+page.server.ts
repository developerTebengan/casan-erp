import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { purchaseService } from '$lib/server/services/purchase.service';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';
import { userService } from '$lib/server/services/user.service';
import { hasPermission } from '$lib/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const user = await requireAuth(cookies);
	const purchase = await purchaseService().getById(params.id);
	if (!purchase) throw error(404, 'Purchasing request not found');

	const receipt = await goodsReceiptService().getReceiptSummary(params.id);
	const goodsReceipts = await goodsReceiptService().listByPurchase(params.id);
	const canReceive = hasPermission(user.role, 'purchasing:receive');
	const canWrite = hasPermission(user.role, 'purchasing:write');
	const isAdmin = user.role === 'ADMIN';
	const users = isAdmin ? await userService().list() : [];
	const canEdit =
		canWrite &&
		(purchase.approvalStatus === 'PENDING' || purchase.approvalStatus === 'REJECTED');

	return {
		purchase,
		user,
		receipt,
		goodsReceipts,
		canReceive,
		canWrite,
		canEdit,
		isAdmin,
		users
	};
};
