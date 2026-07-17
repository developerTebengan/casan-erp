import { db } from '$lib/server/db';
import type { Category } from '$lib/types';

export function categoryRepository() {
	async function findAll(): Promise<Category[]> {
		const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
		return categories.map((c) => ({ id: c.id, name: c.name }));
	}

	return { findAll };
}
