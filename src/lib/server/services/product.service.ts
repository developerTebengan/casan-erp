import { productRepository } from '$lib/server/repositories/product.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type {
	ProductCreateInput,
	ProductUpdateInput
} from '$lib/server/repositories/product.repository';

export function productService() {
	const repo = productRepository();

	function validate(input: Record<string, unknown>): ValidationResult<ProductCreateInput> {
		const requiredErrors = validateRequired(input, ['code', 'name', 'categoryId', 'unit']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const stock = Number(input.stock);
		const minimumStock = Number(input.minimumStock);
		if (Number.isNaN(stock) || stock < 0) errors.stock = ['Stock must be a non-negative number'];
		if (Number.isNaN(minimumStock) || minimumStock < 0)
			errors.minimumStock = ['Minimum stock must be a non-negative number'];

		const price = Number(input.price ?? 0);
		if (Number.isNaN(price) || price < 0) errors.price = ['Price must be a non-negative number'];

		const status = input.status as string;
		if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
			errors.status = ['Status must be ACTIVE or INACTIVE'];
		}

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				code: String(input.code).trim(),
				name: String(input.name).trim(),
				categoryId: String(input.categoryId),
				unit: String(input.unit).trim(),
				stock,
				minimumStock,
				price,
				status: (status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE'
			}
		};
	}

	async function list(filters: Parameters<typeof repo.findAll>[0]) {
		return repo.findAll(filters);
	}

	async function getById(id: string) {
		return repo.findById(id);
	}

	async function create(input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findByCode(validation.data!.code);
		if (existing) {
			return { success: false, errors: { code: ['Product code already exists'] } };
		}

		const product = await repo.create(validation.data!);
		return { success: true, data: product };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Product not found'] } };

		if (validation.data!.code !== existing.code) {
			const duplicate = await repo.findByCode(validation.data!.code);
			if (duplicate) {
				return { success: false, errors: { code: ['Product code already exists'] } };
			}
		}

		const product = await repo.update(id, validation.data!);
		return { success: true, data: product };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Product not found'] } };
		await repo.remove(id);
		return { success: true };
	}

	return { list, getById, create, update, remove, validate };
}
