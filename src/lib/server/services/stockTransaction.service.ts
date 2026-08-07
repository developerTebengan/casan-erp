import { db } from '$lib/server/db';
import {
	stockTransactionRepository,
	type StockTransactionCreateInput
} from '$lib/server/repositories/stockTransaction.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type { StockTransactionType, StockTransactionSource } from '$lib/types';

export interface StockTransactionManualInput {
	productId: string;
	type: StockTransactionType;
	qty: number;
	note?: string | null;
}

export function stockTransactionService() {
	const repo = stockTransactionRepository();

	function validate(input: Record<string, unknown>): ValidationResult<StockTransactionManualInput> {
		const requiredErrors = validateRequired(input, ['productId', 'type', 'qty']);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const type = String(input.type).toUpperCase();
		if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
			errors.type = ['Type must be IN, OUT, or ADJUSTMENT'];
		}

		const qty = Number(input.qty);
		if (Number.isNaN(qty) || qty < 0) {
			errors.qty = ['Quantity must be a non-negative number'];
		} else if (type !== 'ADJUSTMENT' && qty === 0) {
			errors.qty = ['Quantity must be greater than 0'];
		}

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				productId: String(input.productId),
				type: type as StockTransactionType,
				qty,
				note: input.note ? String(input.note) : null
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

		const { productId, type, qty, note } = validation.data!;

		const product = await db.product.findFirst({ where: { id: productId, deletedAt: null } });
		if (!product) {
			return { success: false, errors: { productId: ['Product not found'] } };
		}

		let stockAfter = product.stock;
		let signedQty = qty;

		if (type === 'IN') {
			stockAfter = product.stock + qty;
		} else if (type === 'OUT') {
			if (qty > product.stock) {
				return {
					success: false,
					errors: { qty: [`Insufficient stock. Available: ${product.stock} ${product.unit}`] }
				};
			}
			stockAfter = product.stock - qty;
			signedQty = -qty;
		} else if (type === 'ADJUSTMENT') {
			stockAfter = qty;
			signedQty = qty - product.stock;
		}

		const txInput: StockTransactionCreateInput = {
			productId: product.id,
			type,
			source: 'MANUAL' as StockTransactionSource,
			qty: signedQty,
			stockBefore: product.stock,
			stockAfter,
			note,
			createdBy
		};

		const tx = await repo.create(txInput);
		await db.product.update({ where: { id: product.id }, data: { stock: stockAfter } });

		return { success: true, data: tx };
	}

	async function reverse(id: string, createdBy?: string | null, reason?: string | null) {
		const original = await repo.findById(id);
		if (!original) {
			return { success: false, errors: { form: ['Stock transaction not found'] } };
		}

		if (original.note?.includes('[REVERSED]') || original.note?.startsWith('Reversal of ')) {
			return {
				success: false,
				errors: { form: ['This transaction was already reversed or is a reversal'] }
			};
		}

		const existingReversal = await db.stockTransaction.findFirst({
			where: {
				deletedAt: null,
				note: { startsWith: `Reversal of ${original.id}` }
			}
		});
		if (existingReversal) {
			return { success: false, errors: { form: ['This transaction was already reversed'] } };
		}

		const product = await db.product.findFirst({
			where: { id: original.productId, deletedAt: null }
		});
		if (!product) {
			return { success: false, errors: { form: ['Product not found'] } };
		}

		const delta = -original.qty; // undo the signed qty effect on stock
		const stockAfter = product.stock + delta;
		if (stockAfter < 0) {
			return {
				success: false,
				errors: {
					form: [
						`Cannot reverse: would leave negative stock (${stockAfter}). Available: ${product.stock}`
					]
				}
			};
		}

		let reverseType: StockTransactionType = 'ADJUSTMENT';
		if (original.type === 'IN') reverseType = 'OUT';
		else if (original.type === 'OUT') reverseType = 'IN';
		else reverseType = 'ADJUSTMENT';

		const noteParts = [
			`Reversal of ${original.id}`,
			reason?.trim() ? reason.trim() : null
		].filter(Boolean);

		const reverseTx = await repo.create({
			productId: product.id,
			type: reverseType,
			source: 'ADJUSTMENT',
			referenceId: original.referenceId,
			qty: delta,
			stockBefore: product.stock,
			stockAfter,
			note: noteParts.join(' — '),
			createdBy
		});

		await db.product.update({ where: { id: product.id }, data: { stock: stockAfter } });

		await db.stockTransaction.update({
			where: { id: original.id },
			data: {
				note: `${original.note ? original.note + ' ' : ''}[REVERSED]`
			}
		});

		return { success: true, data: reverseTx };
	}

	return { list, getById, create, reverse, validate };
}
