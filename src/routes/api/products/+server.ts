import { json, error } from '@sveltejs/kit';
import { productService } from '$lib/server/services/product.service';
import { PRODUCT_SORT_FIELDS } from '$lib/server/repositories/product.repository';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const search = url.searchParams.get('search') || undefined;
		const categoryId = url.searchParams.get('categoryId') || undefined;
		const status = (url.searchParams.get('status') as 'ACTIVE' | 'INACTIVE') || undefined;
		const lowStock = url.searchParams.get('lowStock') === '1';
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));
		const sortParam = url.searchParams.get('sort');
		const sort = (PRODUCT_SORT_FIELDS as readonly string[]).includes(sortParam ?? '')
			? (sortParam ?? undefined)
			: undefined;
		const orderParam = url.searchParams.get('order');
		const order = orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined;

		const service = productService();
		const result = await service.list({
			search,
			categoryId,
			status,
			lowStock,
			page,
			limit,
			sort,
			order
		});
		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load products' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

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
