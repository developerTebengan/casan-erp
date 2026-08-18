import { json, error } from '@sveltejs/kit';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';
import type { PettyCashType } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const type = (url.searchParams.get('type') as PettyCashType | null) || undefined;
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const result = await pettyCashService().list({ type, page, limit, from, to });
		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load petty cash' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const body = await request.json();
		const result = await pettyCashService().topUp(body, locals.user.id);
		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}
		return json(result.data, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to top up petty cash' });
	}
};
