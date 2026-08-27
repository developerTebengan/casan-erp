import { json, error } from '@sveltejs/kit';
import { reportService, csvResponse } from '$lib/server/services/report.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'reports:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const from = url.searchParams.get('from') || undefined;
		const to = url.searchParams.get('to') || undefined;
		const format = url.searchParams.get('format');

		const result = await reportService().stockMovements(from, to);
		if (format === 'csv') {
			return csvResponse('stock-movements.csv', result.csv);
		}
		return json(result.data);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load stock movements report' });
	}
};
