import {
	warehouseRepository,
	type WarehouseUpdateInput
} from '$lib/server/repositories/warehouse.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';

export interface WarehouseInput {
	code: string;
	name: string;
	isDefault: boolean;
}

export function warehouseService() {
	const repo = warehouseRepository();

	function validate(input: Record<string, unknown>): ValidationResult<WarehouseInput> {
		const requiredErrors = validateRequired(input, ['code', 'name']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const code = String(input.code ?? '').trim().toUpperCase();
		const name = String(input.name ?? '').trim();

		if (!code) errors.code = ['Code is required'];
		if (!name) errors.name = ['Name is required'];

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				code,
				name,
				isDefault: Boolean(input.isDefault)
			}
		};
	}

	async function list() {
		return repo.findAll();
	}

	async function getById(id: string) {
		return repo.findById(id);
	}

	async function getDefault() {
		return repo.findDefault();
	}

	async function create(input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false as const, errors: validation.errors };

		const duplicate = await repo.findByCode(validation.data!.code);
		if (duplicate) {
			return { success: false as const, errors: { code: ['Warehouse code already exists'] } };
		}

		if (validation.data!.isDefault) {
			await repo.clearDefaultExcept();
		} else {
			const existingDefault = await repo.findDefault();
			if (!existingDefault) {
				validation.data!.isDefault = true;
			}
		}

		const warehouse = await repo.create(validation.data!);
		return { success: true as const, data: warehouse };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false as const, errors: validation.errors };

		const existing = await repo.findById(id);
		if (!existing) {
			return { success: false as const, errors: { form: ['Warehouse not found'] } };
		}

		if (validation.data!.code.toLowerCase() !== existing.code.toLowerCase()) {
			const duplicate = await repo.findByCode(validation.data!.code);
			if (duplicate) {
				return { success: false as const, errors: { code: ['Warehouse code already exists'] } };
			}
		}

		if (existing.isDefault && !validation.data!.isDefault) {
			return {
				success: false as const,
				errors: { isDefault: ['Set another warehouse as default before unsetting this one'] }
			};
		}

		if (validation.data!.isDefault) {
			await repo.clearDefaultExcept(id);
		}

		const warehouse = await repo.update(id, validation.data! as WarehouseUpdateInput);
		return { success: true as const, data: warehouse };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false as const, errors: { form: ['Warehouse not found'] } };

		if (existing.isDefault) {
			return {
				success: false as const,
				errors: { form: ['Cannot delete the default warehouse. Set another default first.'] }
			};
		}

		const refs = await repo.countReferences(id);
		if (refs > 0) {
			return {
				success: false as const,
				errors: {
					form: ['Cannot delete warehouse with stock, transactions, or related records']
				}
			};
		}

		await repo.remove(id);
		return { success: true as const };
	}

	return { list, getById, getDefault, create, update, remove, validate };
}
