import { json, error } from '@sveltejs/kit';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import { hasPermission } from '$lib/permissions';
import { csvFileResponse } from '$lib/utils/csv';
import { formatDateTime } from '$lib/utils/format';
import { ledgerInOut, sourceOfFundLabel } from '$lib/petty-cash/sourceOfFund';
import type { RequestHandler } from './$types';
import type { PettyCashType, SourceOfFund } from '$lib/types';

function typeLabel(type: string) {
	if (type === 'TOP_UP') return 'Top up';
	if (type === 'SPEND') return 'Spend';
	if (type === 'TRANSFER') return 'Transfer';
	return 'Refund';
}

const TYPES = ['TOP_UP', 'SPEND', 'REFUND', 'TRANSFER'] as const;
const SOURCES = ['CASH', 'BANK_TRANSFER', 'DIRECTOR', 'REVENUE', 'OTHER', 'PR_LEFTOVER'] as const;

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const rawType = url.searchParams.get('type');
		const type = TYPES.includes(rawType as PettyCashType)
			? (rawType as PettyCashType)
			: undefined;
		const rawSource = url.searchParams.get('sourceOfFund');
		const sourceOfFund = SOURCES.includes(rawSource as SourceOfFund)
			? (rawSource as SourceOfFund)
			: undefined;
		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const exportCsv = url.searchParams.get('export') === '1';
		const service = pettyCashService();

		if (exportCsv) {
			const rows = await service.listForExport({ type, sourceOfFund, from, to });
			return csvFileResponse(
				'petty-cash-ledger.csv',
				[
					'Date',
					'Type',
					'Source of fund',
					'In',
					'Out',
					'Balance after',
					'Product',
					'Supplier',
					'Note'
				],
				rows.map((row) => {
					const cols = ledgerInOut(row.type, row.amount);
					return [
						formatDateTime(row.createdAt),
						typeLabel(row.type),
						sourceOfFundLabel(row.sourceOfFund),
						cols.inn ?? '',
						cols.out ?? '',
						row.balanceAfter,
						row.product ? `${row.product.code} — ${row.product.name}` : '',
						row.supplier?.name ?? '',
						row.note ?? ''
					];
				})
			);
		}

		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
		const result = await service.list({ type, sourceOfFund, page, limit, from, to });
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
