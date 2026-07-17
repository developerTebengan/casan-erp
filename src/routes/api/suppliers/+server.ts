import { json, error } from '@sveltejs/kit';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const repo = supplierRepository();
		const suppliers = await repo.findAll();
		return json(suppliers);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load suppliers' });
	}
};
