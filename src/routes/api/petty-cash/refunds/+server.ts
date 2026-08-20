import { json, error } from '@sveltejs/kit';
import { refundRequestService } from '$lib/server/services/refundRequest.service';
import { hasPermission } from '$lib/permissions';
import { csvFileResponse } from '$lib/utils/csv';
import { formatDateTime } from '$lib/utils/format';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const tab = url.searchParams.get('tab') === 'posted' ? 'posted' : 'pending';
		const kind = url.searchParams.get('kind') || undefined;
		const destination = url.searchParams.get('destination') || undefined;
		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const exportCsv = url.searchParams.get('export') === '1';
		const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
		const limit = exportCsv
			? 5000
			: Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
		const result = await refundRequestService().listQueue({
			tab,
			kind,
			destination,
			from,
			to,
			page,
			limit
		});

		if (exportCsv) {
			return csvFileResponse(
				'petty-cash-refunds.csv',
				[
					'Date',
					'Kind',
					'Status',
					'PR',
					'Supplier',
					'Product',
					'Amount',
					'Destination',
					'Note'
				],
				result.rows.map((row) => [
					formatDateTime(row.createdAt),
					row.kind === 'PR_LEFTOVER' ? 'PR leftover' : 'Catalog variance',
					row.status,
					'prNumber' in row ? row.prNumber : '',
					'supplierName' in row ? row.supplierName : '',
					'product' in row && row.product ? `${row.product.code} — ${row.product.name}` : '',
					row.amount,
					'destination' in row && row.destination
						? row.destination === 'KAS_KECIL'
							? 'Kas kecil'
							: 'Bank'
						: '',
					'note' in row ? (row.note ?? '') : (row.rejectReason ?? '')
				])
			);
		}

		return json(result);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load refunds' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'pettyCash:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const body = await request.json();
		const result = await refundRequestService().createFromList(body, locals.user.id);
		if (!result.success) {
			const status = 'status' in result && result.status === 409 ? 409 : 400;
			return json({ message: 'Validation failed', errors: result.errors }, { status });
		}
		return json(result.data, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to create refund request' });
	}
};
