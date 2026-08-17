import { json, error } from '@sveltejs/kit';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || undefined;
		const productId = url.searchParams.get('productId') || undefined;
		const type = (url.searchParams.get('type') as 'IN' | 'OUT' | 'ADJUSTMENT') || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));

		const service = stockTransactionService();
		const result = await service.list({ search, productId, type, page, limit });
		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load stock transactions' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const service = stockTransactionService();
		const result = await service.create(body, locals.user?.id ?? null);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create stock transaction' });
	}
};
