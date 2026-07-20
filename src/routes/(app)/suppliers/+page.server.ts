import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const suppliers = await supplierRepository().findAll();
	return { suppliers };
};
