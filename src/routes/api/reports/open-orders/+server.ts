import { json, error } from '@sveltejs/kit';
import { reportService, csvResponse } from '$lib/server/services/report.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'reports:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const format = url.searchParams.get('format');
		const result = await reportService().openOrdersAging();
		if (format === 'csv') {
			return csvResponse('open-orders-aging.csv', result.csv);
		}
		return json(result.data);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load open orders aging report' });
	}
};
