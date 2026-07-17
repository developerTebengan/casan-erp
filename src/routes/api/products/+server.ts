import { json, error } from '@sveltejs/kit';
import { productService } from '$lib/server/services/product.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search') || undefined;
		const categoryId = url.searchParams.get('categoryId') || undefined;
		const status = (url.searchParams.get('status') as 'ACTIVE' | 'INACTIVE') || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));

		const service = productService();
		const result = await service.list({ search, categoryId, status, page, limit });
		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load products' });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const service = productService();
		const result = await service.create(body);

		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data, { status: 201 });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to create product' });
	}
};
