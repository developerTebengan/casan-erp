import { json, error } from '@sveltejs/kit';
import { categoryRepository } from '$lib/server/repositories/category.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const repo = categoryRepository();
		const categories = await repo.findAll();
		return json(categories);
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to load categories' });
	}
};
