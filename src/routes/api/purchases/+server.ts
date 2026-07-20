import { json, error } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/services/purchase.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || undefined;
		const supplierId = url.searchParams.get('supplierId') || undefined;
		const priority =
			(url.searchParams.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));

		const service = purchaseService();
		const result = await service.list({ search, supplierId, priority, page, limit });
		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load purchases' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const service = purchaseService();
		const requesterId = locals.user?.id;
		if (!requesterId) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}
		const result = await service.create(body, requesterId);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create purchasing request' });
	}
};
