import { json, error } from '@sveltejs/kit';
import { refundRequestService } from '$lib/server/services/refundRequest.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

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
		throw error(500, { message: 'Failed to save settlement' });
	}
};
