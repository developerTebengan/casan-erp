import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { purchaseService } from '$lib/server/services/purchase.service';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';
import { refundRequestService } from '$lib/server/services/refundRequest.service';
import { userService } from '$lib/server/services/user.service';
import { hasPermission } from '$lib/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const user = await requireAuth(cookies);
	const purchase = await purchaseService().getById(params.id);
	if (!purchase) throw error(404, 'Purchasing request not found');

	const receipt = await goodsReceiptService().getReceiptSummary(params.id);
	const snap = await refundRequestService().snapshot(params.id);
	const leftover = snap
		? {
				lineTotal: snap.lineTotal,
				tax: snap.tax,
				shipping: snap.shipping,
				otherFees: snap.otherFees,
				actualTax: snap.actualTax,
				actualShipping: snap.actualShipping,
				actualOtherFees: snap.actualOtherFees,
				approvedGrand: snap.approvedGrand,
				actualGoods: snap.actualGoods,
				actualExtras: snap.actualExtras,
				leftover: snap.leftover,
				hasActive: snap.hasActive
			}
		: null;
	const canReceive = hasPermission(user.role, 'purchasing:receive');
	const isAdmin = user.role === 'ADMIN';
	const users = isAdmin ? await userService().list() : [];

	return { purchase, user, receipt, canReceive, isAdmin, users, leftover };
};
