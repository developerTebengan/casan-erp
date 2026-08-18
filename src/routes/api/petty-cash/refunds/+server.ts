import { json, error } from '@sveltejs/kit';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import { hasPermission } from '$lib/permissions';
import { csvFileResponse } from '$lib/utils/csv';
import { formatDateTime } from '$lib/utils/format';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const exportCsv = url.searchParams.get('export') === '1';
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
		const service = pettyCashService();

		if (exportCsv) {
			const rows = await service.listForExport({ type: 'REFUND', from, to });
			return csvFileResponse(
				'petty-cash-refunds.csv',
				[
					'Date',
					'Product',
					'Qty',
					'Catalog unit',
					'Catalog total',
					'Paid',
					'Refund',
					'Note'
				],
				rows.map((row) => [
					formatDateTime(row.createdAt),
					row.product ? `${row.product.code} — ${row.product.name}` : '',
					row.qty ?? '',
					row.catalogUnitPrice ?? '',
					row.expectedAmount ?? '',
					row.paidAmount ?? '',
					row.amount,
					row.note ?? ''
				])
			);
		}

		const result = await service.list({ type: 'REFUND', page, limit, from, to });
		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load refunds' });
	}
};
