import { json, error } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/services/purchase.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const service = purchaseService();
		const purchase = await service.getById(params.id);
		if (!purchase) throw error(404, { message: 'Purchasing request not found' });
		return json(purchase);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load purchasing request' });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const service = purchaseService();
		const result = await service.remove(params.id);

		if (!result.success) {
			return json(
				{ message: 'Failed to delete purchasing request', errors: result.errors },
				{ status: 400 }
			);
		}

		return json({ success: true });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to delete purchasing request' });
	}
};
