import { db } from '$lib/server/db';
import { stockTransactionRepository } from '$lib/server/repositories/stockTransaction.repository';
import { warehouseRepository } from '$lib/server/repositories/warehouse.repository';
import {
	applyProductStockDelta,
	getWarehouseQty,
	setProductStockQty
} from '$lib/server/productStock';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type { StockTransactionType, StockTransactionSource } from '$lib/types';

export interface StockTransactionManualInput {
	productId: string;
	type: StockTransactionType;
	qty: number;
	note?: string | null;
	warehouseId?: string | null;
}

export interface StockTransferInput {
	productId: string;
	fromWarehouseId: string;
	toWarehouseId: string;
	qty: number;
	note?: string | null;
}

export function stockTransactionService() {
	const repo = stockTransactionRepository();
	const warehouses = warehouseRepository();

	async function resolveWarehouseId(warehouseId?: string | null): Promise<string | null> {
		if (warehouseId) {
			const wh = await warehouses.findById(warehouseId);
			return wh?.id ?? null;
		}
		const def = await warehouses.findDefault();
		return def?.id ?? null;
	}

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
				note: input.note ? String(input.note) : null,
				warehouseId: input.warehouseId ? String(input.warehouseId) : null
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
		const warehouseId = await resolveWarehouseId(validation.data!.warehouseId);
		if (validation.data!.warehouseId && !warehouseId) {
			return { success: false, errors: { warehouseId: ['Warehouse not found'] } };
		}

		const product = await db.product.findFirst({ where: { id: productId, deletedAt: null } });
		if (!product) {
			return { success: false, errors: { productId: ['Product not found'] } };
		}

		try {
			const created = await db.$transaction(async (prisma) => {
				const whStock = await getWarehouseQty(prisma, product.id, warehouseId, product.stock);

				let stockAfter = product.stock;
				let signedQty = qty;
				let warehouseQtyAfter = whStock;

				if (type === 'IN') {
					stockAfter = product.stock + qty;
					signedQty = qty;
					warehouseQtyAfter = whStock + qty;
				} else if (type === 'OUT') {
					if (qty > whStock) {
						throw new Error(`INSUFFICIENT:${whStock}`);
					}
					stockAfter = product.stock - qty;
					signedQty = -qty;
					warehouseQtyAfter = whStock - qty;
				} else if (type === 'ADJUSTMENT') {
					const delta = qty - whStock;
					stockAfter = product.stock + delta;
					signedQty = delta;
					warehouseQtyAfter = qty;
				}

				if (stockAfter < 0) {
					throw new Error(`INSUFFICIENT:${product.stock}`);
				}

				const tx = await prisma.stockTransaction.create({
					data: {
						productId: product.id,
						type,
						source: 'MANUAL' as StockTransactionSource,
						warehouseId,
						qty: signedQty,
						stockBefore: product.stock,
						stockAfter,
						note,
						createdBy
					},
					include: {
						product: {
							include: { category: { select: { id: true, name: true } } }
						}
					}
				});

				await prisma.product.update({
					where: { id: product.id },
					data: { stock: stockAfter }
				});

				if (warehouseId) {
					await setProductStockQty(prisma, product.id, warehouseId, warehouseQtyAfter);
				}

				return tx;
			});

			const mapped = await repo.findById(created.id);
			return { success: true, data: mapped ?? created };
		} catch (e) {
			if (e instanceof Error && e.message.startsWith('INSUFFICIENT:')) {
				const available = e.message.split(':')[1];
				return {
					success: false,
					errors: {
						qty: [`Insufficient stock. Available: ${available} ${product.unit}`]
					}
				};
			}
			throw e;
		}
	}

	async function transfer(input: Record<string, unknown>, createdBy?: string | null) {
		const requiredErrors = validateRequired(input, [
			'productId',
			'fromWarehouseId',
			'toWarehouseId',
			'qty'
		]);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const qty = Number(input.qty);
		if (Number.isNaN(qty) || qty <= 0) {
			errors.qty = ['Quantity must be greater than 0'];
		}

		const fromWarehouseId = String(input.fromWarehouseId ?? '');
		const toWarehouseId = String(input.toWarehouseId ?? '');
		if (fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId) {
			errors.toWarehouseId = ['Destination warehouse must be different'];
		}

		if (Object.keys(errors).length > 0) {
			return { success: false as const, errors };
		}

		const product = await db.product.findFirst({
			where: { id: String(input.productId), deletedAt: null }
		});
		if (!product) {
			return { success: false as const, errors: { productId: ['Product not found'] } };
		}

		const fromWh = await warehouses.findById(fromWarehouseId);
		const toWh = await warehouses.findById(toWarehouseId);
		if (!fromWh) {
			return { success: false as const, errors: { fromWarehouseId: ['Source warehouse not found'] } };
		}
		if (!toWh) {
			return {
				success: false as const,
				errors: { toWarehouseId: ['Destination warehouse not found'] }
			};
		}

		const note =
			(input.note ? String(input.note) : null) ||
			`Transfer ${fromWh.code} → ${toWh.code}`;

		try {
			const created = await db.$transaction(async (prisma) => {
				const fromQty = await getWarehouseQty(prisma, product.id, fromWh.id, product.stock);
				if (qty > fromQty) {
					throw new Error(`INSUFFICIENT:${fromQty}`);
				}

				const outTx = await prisma.stockTransaction.create({
					data: {
						productId: product.id,
						type: 'OUT',
						source: 'TRANSFER',
						warehouseId: fromWh.id,
						qty: -qty,
						stockBefore: product.stock,
						stockAfter: product.stock,
						note,
						createdBy
					}
				});

				const inTx = await prisma.stockTransaction.create({
					data: {
						productId: product.id,
						type: 'IN',
						source: 'TRANSFER',
						referenceId: outTx.id,
						warehouseId: toWh.id,
						qty,
						stockBefore: product.stock,
						stockAfter: product.stock,
						note,
						createdBy
					}
				});

				await applyProductStockDelta(prisma, product.id, fromWh.id, -qty, product.stock);
				await applyProductStockDelta(prisma, product.id, toWh.id, qty, 0);

				return { outTx, inTx };
			});

			return { success: true as const, data: created };
		} catch (e) {
			if (e instanceof Error && e.message.startsWith('INSUFFICIENT:')) {
				const available = e.message.split(':')[1];
				return {
					success: false as const,
					errors: { qty: [`Insufficient stock at source. Available: ${available}`] }
				};
			}
			throw e;
		}
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
				OR: [
					{ reversedFromId: original.id },
					{ note: { startsWith: `Reversal of ${original.id}` } }
				]
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

		const delta = -original.qty;
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

		const reverseSource: StockTransactionSource =
			original.source === 'PURCHASE'
				? 'PURCHASE'
				: original.source === 'TRANSFER'
					? 'TRANSFER'
					: 'ADJUSTMENT';

		const noteParts = [
			`Reversal of ${original.id}`,
			reason?.trim() ? reason.trim() : null
		].filter(Boolean);

		const reverseTx = await db.$transaction(async (prisma) => {
			const created = await prisma.stockTransaction.create({
				data: {
					productId: product.id,
					type: reverseType,
					source: reverseSource,
					referenceId: original.referenceId,
					warehouseId: original.warehouseId ?? null,
					reversedFromId: original.id,
					qty: delta,
					stockBefore: product.stock,
					stockAfter,
					note: noteParts.join(' — '),
					createdBy
				},
				include: {
					product: {
						include: { category: { select: { id: true, name: true } } }
					}
				}
			});

			await prisma.product.update({
				where: { id: product.id },
				data: { stock: stockAfter }
			});

			if (original.warehouseId) {
				await applyProductStockDelta(
					prisma,
					product.id,
					original.warehouseId,
					delta,
					product.stock
				);
			}

			await prisma.stockTransaction.update({
				where: { id: original.id },
				data: {
					note: `${original.note ? original.note + ' ' : ''}[REVERSED]`
				}
			});

			return created;
		});

		const mapped = await repo.findById(reverseTx.id);
		return { success: true, data: mapped ?? reverseTx };
	}

	return { list, getById, create, transfer, reverse, validate };
}
