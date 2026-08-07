import { json, error } from '@sveltejs/kit';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'purchasing:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const summary = await goodsReceiptService().getReceiptSummary(params.id);
		if (!summary) {
			return json({ message: 'Purchasing request not found' }, { status: 404 });
		}
		return json(summary);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load goods receipt summary' });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'purchasing:receive')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await goodsReceiptService().receive(
			params.id,
			body.lines ?? [],
			locals.user.id,
			body.note
		);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to receive goods' });
	}
};
