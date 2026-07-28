import { db } from '$lib/server/db';
import { productRepository } from '$lib/server/repositories/product.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type {
	ProductCreateInput,
	ProductUpdateInput
} from '$lib/server/repositories/product.repository';

export function productService() {
	const repo = productRepository();

	async function generateCode(categoryId?: string): Promise<string> {
		const now = new Date();
		const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
		let prefix = 'PRD';
		if (categoryId) {
			const cat = await db.category.findFirst({
				where: { id: categoryId, deletedAt: null },
				select: { name: true }
			});
			if (cat?.name) {
				prefix = cat.name
					.replace(/[^a-zA-Z0-9]/g, '')
					.slice(0, 3)
					.toUpperCase() || 'PRD';
			}
		}
		const likePrefix = `${prefix}-${yyyymm}-`;
		const latest = await db.product.findFirst({
			where: { code: { startsWith: likePrefix }, deletedAt: null },
			orderBy: { code: 'desc' },
			select: { code: true }
		});
		let seq = 1;
		if (latest?.code) {
			const parts = latest.code.split('-');
			const last = Number(parts[parts.length - 1]);
			if (!Number.isNaN(last)) seq = last + 1;
		}
		return `${likePrefix}${String(seq).padStart(4, '0')}`;
	}

	function validate(
		input: Record<string, unknown>,
		opts?: { requireCode?: boolean }
	): ValidationResult<ProductCreateInput> {
		const requireCode = opts?.requireCode !== false;
		const fields = requireCode
			? ['code', 'name', 'categoryId', 'unit']
			: ['name', 'categoryId', 'unit'];
		const requiredErrors = validateRequired(input, fields);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const stock = Number(input.stock ?? 0);
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
				code: input.code ? String(input.code).trim() : '',
				name: String(input.name).trim(),
				categoryId: String(input.categoryId),
				unit: String(input.unit).trim(),
				stock,
				minimumStock,
				price,
				imageUrl: input.imageUrl ? String(input.imageUrl) : null,
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
		const validation = validate(input, { requireCode: false });
		if (!validation.valid) return { success: false, errors: validation.errors };

		let code = validation.data!.code;
		if (!code) {
			code = await generateCode(validation.data!.categoryId);
		}

		const existing = await repo.findByCode(code);
		if (existing) {
			code = await generateCode(validation.data!.categoryId);
		}

		const product = await repo.create({
			...validation.data!,
			code
		});
		return { success: true, data: product };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Product not found'] } };

		const validation = validate(
			{ ...input, code: input.code || existing.code },
			{ requireCode: true }
		);
		if (!validation.valid) return { success: false, errors: validation.errors };

		if (validation.data!.code !== existing.code) {
			const duplicate = await repo.findByCode(validation.data!.code);
			if (duplicate) {
				return { success: false, errors: { code: ['Product code already exists'] } };
			}
		}

		const product = await repo.update(id, {
			...validation.data!,
			stock: existing.stock,
			imageUrl:
				input.imageUrl !== undefined ? validation.data!.imageUrl : existing.imageUrl
		} as ProductUpdateInput);
		return { success: true, data: product };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Product not found'] } };
		await repo.remove(id);
		return { success: true };
	}

	return { list, getById, create, update, remove, validate, generateCode };
}
