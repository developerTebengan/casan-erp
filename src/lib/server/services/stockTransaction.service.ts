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

		const product = await db.product.findUnique({ where: { id: productId } });
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

	async function createFromPurchase(
		productId: string,
		qty: number,
		referenceId: string,
		note?: string,
		createdBy?: string | null
	) {
		const product = await db.product.findUnique({ where: { id: productId } });
		if (!product) return;

		const stockAfter = product.stock + qty;

		await repo.create({
			productId: product.id,
			type: 'IN',
			source: 'PURCHASE',
			referenceId,
			qty,
			stockBefore: product.stock,
			stockAfter,
			note: note || `Stock in from purchase order ${referenceId}`,
			createdBy
		});

		await db.product.update({ where: { id: product.id }, data: { stock: stockAfter } });
	}

	return { list, getById, create, createFromPurchase, validate };
}
