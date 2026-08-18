import { json, error } from '@sveltejs/kit';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import { hasPermission } from '$lib/permissions';
import { csvFileResponse } from '$lib/utils/csv';
import { formatDateTime } from '$lib/utils/format';
import type { RequestHandler } from './$types';
import type { PettyCashType } from '$lib/types';

function typeLabel(type: string) {
	if (type === 'TOP_UP') return 'Top up';
	if (type === 'SPEND') return 'Spend';
	return 'Refund';
}

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const rawType = url.searchParams.get('type');
		const type = (['TOP_UP', 'SPEND', 'REFUND'] as const).includes(
			rawType as PettyCashType
		)
			? (rawType as PettyCashType)
			: undefined;
		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const exportCsv = url.searchParams.get('export') === '1';
		const service = pettyCashService();

		if (exportCsv) {
			const rows = await service.listForExport({ type, from, to });
			return csvFileResponse(
				'petty-cash-ledger.csv',
				['Date', 'Type', 'Amount', 'Balance after', 'Product', 'Qty', 'Paid', 'Note'],
				rows.map((row) => [
					formatDateTime(row.createdAt),
					typeLabel(row.type),
					row.amount,
					row.balanceAfter,
					row.product ? `${row.product.code} — ${row.product.name}` : '',
					row.qty ?? '',
					row.paidAmount ?? '',
					row.note ?? ''
				])
			);
		}

		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
		const result = await service.list({ type, page, limit, from, to });
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
