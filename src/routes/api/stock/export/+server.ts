import { json, error } from '@sveltejs/kit';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { hasPermission } from '$lib/permissions';
import { csvFileResponse } from '$lib/utils/csv';
import { formatDateTime } from '$lib/utils/format';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'stock:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		const search = url.searchParams.get('search') || undefined;
		const productId = url.searchParams.get('productId') || undefined;
		const type = (url.searchParams.get('type') as 'IN' | 'OUT' | 'ADJUSTMENT') || undefined;
		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const rows = await stockTransactionService().listForExport({ search, productId, type, from, to });
		return csvFileResponse(
			'stock-movement.csv',
			['Date', 'Product code', 'Product', 'Type', 'Source', 'Qty', 'Before', 'After', 'Note'],
			rows.map((tx) => [
				formatDateTime(tx.createdAt),
				tx.product?.code ?? '',
				tx.product?.name ?? '',
				tx.type,
				tx.source,
				tx.qty,
				tx.stockBefore,
				tx.stockAfter,
				tx.note ?? ''
			])
		);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to export stock movement' });
	}
};
