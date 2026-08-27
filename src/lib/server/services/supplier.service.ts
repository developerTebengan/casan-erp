import { supplierRepository } from '$lib/server/repositories/supplier.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type {
	SupplierCreateInput,
	SupplierFilters,
	SupplierUpdateInput
} from '$lib/server/repositories/supplier.repository';
import type { SupplierStatus } from '$lib/types';

export function supplierService() {
	const repo = supplierRepository();

	function validate(input: Record<string, unknown>): ValidationResult<SupplierCreateInput> {
		const requiredErrors = validateRequired(input, ['name']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const status = input.status ? String(input.status) : 'ACTIVE';
		if (!['ACTIVE', 'INACTIVE'].includes(status)) {
			errors.status = ['Status must be ACTIVE or INACTIVE'];
		}

		let leadTimeDays: number | null | undefined = undefined;
		if (input.leadTimeDays !== undefined && input.leadTimeDays !== null && input.leadTimeDays !== '') {
			leadTimeDays = Number(input.leadTimeDays);
			if (Number.isNaN(leadTimeDays) || leadTimeDays < 0) {
				errors.leadTimeDays = ['Lead time must be a non-negative number'];
			}
		} else if (input.leadTimeDays === null || input.leadTimeDays === '') {
			leadTimeDays = null;
		}

		if (input.email) {
			const email = String(input.email).trim();
			if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				errors.email = ['Invalid email address'];
			}
		}

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				name: String(input.name).trim(),
				type: input.type ? String(input.type).trim() : 'GENERAL',
				phone: input.phone ? String(input.phone).trim() : undefined,
				address: input.address ? String(input.address).trim() : undefined,
				contactPerson: input.contactPerson ? String(input.contactPerson).trim() : undefined,
				email: input.email ? String(input.email).trim() : undefined,
				paymentTerms: input.paymentTerms ? String(input.paymentTerms).trim() : undefined,
				leadTimeDays: leadTimeDays === undefined ? undefined : leadTimeDays,
				taxId: input.taxId ? String(input.taxId).trim() : undefined,
				status: status as SupplierStatus
			}
		};
	}

	async function list(filters: SupplierFilters = {}) {
		return repo.findMany(filters);
	}

	async function typeCounts() {
		return repo.countByType();
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

	return { list, typeCounts, getById, create, update, remove, validate };
}
