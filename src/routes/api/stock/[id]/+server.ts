import { json, error } from '@sveltejs/kit';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const service = stockTransactionService();
		const tx = await service.getById(params.id);
		if (!tx) throw error(404, { message: 'Stock transaction not found' });
		return json(tx);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load stock transaction' });
	}
};
