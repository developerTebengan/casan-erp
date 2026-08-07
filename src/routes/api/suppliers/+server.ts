import { json, error } from '@sveltejs/kit';
import { supplierService } from '$lib/server/services/supplier.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || undefined;
		const type = url.searchParams.get('type') || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));

		const service = supplierService();
		const [result, typeCounts] = await Promise.all([
			service.list({ search, type, page, limit }),
			service.typeCounts()
		]);
		return json({ ...result, typeCounts });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load suppliers' });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const service = supplierService();
		const result = await service.create(body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create supplier' });
	}
};
