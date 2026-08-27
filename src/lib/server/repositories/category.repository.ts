import { db } from '$lib/server/db';
import type { Category } from '$lib/types';

export interface CategoryCreateInput {
	name: string;
}

export interface CategoryUpdateInput {
	name: string;
}

export function categoryRepository() {
	async function findAll(): Promise<Category[]> {
		const categories = await db.category.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		});
		return categories.map(mapCategory);
	}

	async function findById(id: string): Promise<Category | null> {
		const category = await db.category.findFirst({ where: { id, deletedAt: null } });
		return category ? mapCategory(category) : null;
	}

	async function findByName(name: string): Promise<Category | null> {
		const category = await db.category.findFirst({
			where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null }
		});
		return category ? mapCategory(category) : null;
	}

	async function create(input: CategoryCreateInput): Promise<Category> {
		const category = await db.category.create({
			data: { name: input.name }
		});
		return mapCategory(category);
	}

	async function update(id: string, input: CategoryUpdateInput): Promise<Category> {
		const category = await db.category.update({
			where: { id },
			data: { name: input.name }
		});
		return mapCategory(category);
	}

	async function remove(id: string): Promise<void> {
		await db.category.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	async function countProducts(id: string): Promise<number> {
		return db.product.count({ where: { categoryId: id, deletedAt: null } });
	}

	return { findAll, findById, findByName, create, update, remove, countProducts };
}

function mapCategory(c: {
	id: string;
	name: string;
	createdAt?: Date;
	updatedAt?: Date;
}): Category {
	return {
		id: c.id,
		name: c.name,
		createdAt: c.createdAt?.toISOString(),
		updatedAt: c.updatedAt?.toISOString()
	};
}
