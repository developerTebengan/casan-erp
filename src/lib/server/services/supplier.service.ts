import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type { SupplierCreateInput, SupplierUpdateInput } from '$lib/server/repositories/supplier.repository';

export function supplierService() {
	const repo = supplierRepository();

	function validate(input: Record<string, unknown>): ValidationResult<SupplierCreateInput> {
		const requiredErrors = validateRequired(input, ['name']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				name: String(input.name).trim(),
				phone: input.phone ? String(input.phone).trim() : undefined,
				address: input.address ? String(input.address).trim() : undefined
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
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findByName(validation.data!.name);
		if (existing) {
			return { success: false, errors: { name: ['Supplier name already exists'] } };
		}

		const supplier = await repo.create(validation.data!);
		return { success: true, data: supplier };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const validation = validate(input);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findById(id);
		if (!existing) {
			return { success: false, errors: { form: ['Supplier not found'] } };
		}

		if (validation.data!.name.toLowerCase() !== existing.name.toLowerCase()) {
			const duplicate = await repo.findByName(validation.data!.name);
			if (duplicate) {
				return { success: false, errors: { name: ['Supplier name already exists'] } };
			}
		}

		const supplier = await repo.update(id, validation.data! as SupplierUpdateInput);
		return { success: true, data: supplier };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Supplier not found'] } };

		try {
			await repo.remove(id);
			return { success: true };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to delete supplier';
			return { success: false, errors: { form: [message] } };
		}
	}

	return { list, getById, create, update, remove, validate };
}
