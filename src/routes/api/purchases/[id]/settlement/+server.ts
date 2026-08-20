import { json, error } from '@sveltejs/kit';
import { refundRequestService } from '$lib/server/services/refundRequest.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const snap = await refundRequestService().snapshot(params.id);
		if (!snap) return json({ message: 'Purchase not found' }, { status: 404 });
		return json({
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
			hasActive: snap.hasActive,
			prNumber: snap.purchase.prNumber
		});
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load leftover' });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'purchasing:receive')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const body = await request.json();
		const result = await refundRequestService().saveAndMaybeRequest(
			params.id,
			body,
			locals.user.id
		);
		if (!result.success) {
			const status = 'status' in result && result.status === 409 ? 409 : 400;
			return json({ message: 'Validation failed', errors: result.errors }, { status });
		}
		return json(result.data);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to save leftover' });
	}
};
