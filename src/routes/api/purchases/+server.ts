import { json, error } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/services/purchase.service';
import { PURCHASE_SORT_FIELDS } from '$lib/server/repositories/purchase.repository';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'purchasing:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const search = url.searchParams.get('search') || undefined;
		const supplierId = url.searchParams.get('supplierId') || undefined;
		const priority =
			(url.searchParams.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || undefined;
		const approvalStatus =
			(url.searchParams.get('approvalStatus') as 'PENDING' | 'APPROVED' | 'REJECTED') || undefined;
		const awaitingMe = url.searchParams.get('awaitingMe') === '1';
		const myDecision = url.searchParams.get('myDecision') as
			'PENDING' | 'APPROVED' | 'REJECTED' | null;
		const decidedAfter = url.searchParams.get('decidedAfter') || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));
		const sortParam = url.searchParams.get('sort');
		const sort = (PURCHASE_SORT_FIELDS as readonly string[]).includes(sortParam ?? '')
			? (sortParam ?? undefined)
			: undefined;
		const orderParam = url.searchParams.get('order');
		const order = orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined;

		const service = purchaseService();
		const [result, statusCounts] = await Promise.all([
			service.list({
				search,
				supplierId,
				priority,
				approvalStatus,
				awaitingApproverId: awaitingMe ? locals.user.id : undefined,
				myApproverId: myDecision ? locals.user.id : undefined,
				myDecision: myDecision || undefined,
				decidedAfter,
				page,
				limit,
				sort,
				order
			}),
			service.statusCounts()
		]);
		return json({ ...result, statusCounts });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load purchases' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'purchasing:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const service = purchaseService();
		const result = await service.create(body, locals.user.id);

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
