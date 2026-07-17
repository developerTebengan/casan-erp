import { categoryRepository } from '$lib/server/repositories/category.repository';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const categories = await categoryRepository().findAll();
	return { categories };
};
