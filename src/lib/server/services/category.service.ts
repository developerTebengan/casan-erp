import {
	categoryRepository,
	type CategoryCreateInput,
	type CategoryUpdateInput
} from '$lib/server/repositories/category.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';

export function categoryService() {
	const repo = categoryRepository();

	function validate(input: Record<string, unknown>): ValidationResult<CategoryCreateInput> {
		const requiredErrors = validateRequired(input, ['name']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				name: String(input.name).trim()
			}
		};
	}

	async function list() {
		return repo.findAll();
	}

	async function getById(id: string) {
		return repo.findById(id);
	}

	async function create(input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false as const, errors: validation.errors };

		const existing = await repo.findByName(validation.data!.name);
		if (existing) {
			return { success: false as const, errors: { name: ['Category name already exists'] } };
		}

		const category = await repo.create(validation.data!);
		return { success: true as const, data: category };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false as const, errors: validation.errors };

		const existing = await repo.findById(id);
		if (!existing) {
			return { success: false as const, errors: { form: ['Category not found'] } };
		}

		if (validation.data!.name.toLowerCase() !== existing.name.toLowerCase()) {
			const duplicate = await repo.findByName(validation.data!.name);
			if (duplicate) {
				return { success: false as const, errors: { name: ['Category name already exists'] } };
			}
		}

		const category = await repo.update(id, validation.data! as CategoryUpdateInput);
		return { success: true as const, data: category };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false as const, errors: { form: ['Category not found'] } };

		const productCount = await repo.countProducts(id);
		if (productCount > 0) {
			return {
				success: false as const,
				errors: {
					form: [`Cannot delete category with ${productCount} product(s). Reassign products first.`]
				}
			};
		}

		try {
			await repo.remove(id);
			return { success: true as const };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to delete category';
			return { success: false as const, errors: { form: [message] } };
		}
	}

	return { list, getById, create, update, remove, validate };
}
