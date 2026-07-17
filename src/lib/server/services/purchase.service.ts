import { purchaseRepository } from '$lib/server/repositories/purchase.repository';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type { PurchaseCreateInput } from '$lib/server/repositories/purchase.repository';

export function purchaseService() {
	const repo = purchaseRepository();

	function validateItems(
		items: unknown
	):
		| { valid: true; data: { productId: string; qty: number; price: number }[] }
		| { valid: false; errors: string } {
		if (!Array.isArray(items) || items.length === 0) {
			return { valid: false, errors: 'At least one item is required' };
		}
		const parsed: { productId: string; qty: number; price: number }[] = [];
		for (const item of items) {
			if (!item.productId || !item.qty || !item.price) {
				return { valid: false, errors: 'Each item must have product, quantity, and price' };
			}
			const qty = Number(item.qty);
			const price = Number(item.price);
			if (Number.isNaN(qty) || qty <= 0)
				return { valid: false, errors: 'Quantity must be a positive number' };
			if (Number.isNaN(price) || price < 0)
				return { valid: false, errors: 'Price must be a non-negative number' };
			parsed.push({ productId: String(item.productId), qty, price });
		}
		return { valid: true, data: parsed };
	}

	function validate(input: Record<string, unknown>): ValidationResult<PurchaseCreateInput> {
		const requiredErrors = validateRequired(input, ['poNumber', 'supplierId', 'purchaseDate']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const status = input.status as string;
		if (status && !['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].includes(status)) {
			errors.status = ['Invalid status'];
		}

		const itemsValidation = validateItems(input.items);
		if (!itemsValidation.valid) {
			errors.items = [itemsValidation.errors];
		}

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		if (!itemsValidation.valid) {
			return { valid: false, errors: { items: [itemsValidation.errors] } };
		}

		return {
			valid: true,
			data: {
				poNumber: String(input.poNumber).trim(),
				supplierId: String(input.supplierId),
				purchaseDate: new Date(String(input.purchaseDate)),
				status: (status as PurchaseCreateInput['status']) || 'DRAFT',
				items: itemsValidation.data
			}
		};
	}

	async function list(filters: Parameters<typeof repo.findAll>[0]) {
		return repo.findAll(filters);
	}

	async function getById(id: string) {
		return repo.findById(id);
	}

	async function create(input: Record<string, unknown>, createdBy?: string | null) {
		const validation = validate(input);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findByPoNumber(validation.data!.poNumber);
		if (existing) {
			return { success: false, errors: { poNumber: ['PO number already exists'] } };
		}

		const purchase = await repo.create(validation.data!);

		if (purchase.status === 'RECEIVED' && purchase.items?.length) {
			const stockService = stockTransactionService();
			for (const item of purchase.items) {
				await stockService.createFromPurchase(
					item.productId,
					item.qty,
					purchase.id,
					`Stock in from PO ${purchase.poNumber}`,
					createdBy
				);
			}
		}

		return { success: true, data: purchase };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Purchase order not found'] } };
		await repo.remove(id);
		return { success: true };
	}

	return { list, getById, create, remove, validate };
}
