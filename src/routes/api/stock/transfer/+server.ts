import { json, error } from '@sveltejs/kit';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await stockTransactionService().transfer(body, locals.user.id);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to transfer stock' });
	}
};
