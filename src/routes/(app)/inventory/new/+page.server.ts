import { categoryRepository } from '$lib/server/repositories/category.repository';
import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [categories, suppliers] = await Promise.all([
		categoryRepository().findAll(),
		supplierRepository().findAll()
	]);
	return { categories, suppliers };
};
