import { requirePermission } from '$lib/server/auth';
import { categoryService } from '$lib/server/services/category.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'categories:manage');
	const categories = await categoryService().list();
	return { categories };
};
