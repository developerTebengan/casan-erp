import { db } from '$lib/server/db';
import { getWarehouseQty, setProductStockQty } from '$lib/server/productStock';
import { warehouseRepository } from '$lib/server/repositories/warehouse.repository';
import type { CycleCount } from '$lib/types';

export type CycleCountLineInput = {
	productId: string;
	countedQty: number;
	systemQty?: number;
};

function mapCycleCount(cc: {
	id: string;
	code: string;
	warehouseId: string;
	status: string;
	note: string | null;
	createdById: string | null;
	postedAt: Date | null;
	createdAt: Date;
	warehouse?: { id: string; code: string; name: string; isDefault: boolean } | null;
	lines?: {
		id: string;
		productId: string;
		systemQty: number;
		countedQty: number;
		variance: number;
		product?: {
			id: string;
			code: string;
			name: string;
			unit: string;
			categoryId: string;
			stock: number;
			minimumStock: number;
			price: unknown;
			status: string;
			createdAt: Date;
			updatedAt: Date;
			category?: { id: string; name: string } | null;
		} | null;
	}[];
}): CycleCount {
	return {
		id: cc.id,
		code: cc.code,
		warehouseId: cc.warehouseId,
		warehouse: cc.warehouse
			? {
					id: cc.warehouse.id,
					code: cc.warehouse.code,
					name: cc.warehouse.name,
					isDefault: cc.warehouse.isDefault
				}
			: undefined,
		status: cc.status as CycleCount['status'],
		note: cc.note,
		createdById: cc.createdById,
		postedAt: cc.postedAt?.toISOString() ?? null,
		createdAt: cc.createdAt.toISOString(),
		lines: cc.lines?.map((l) => ({
			id: l.id,
			productId: l.productId,
			systemQty: l.systemQty,
			countedQty: l.countedQty,
			variance: l.variance,
			product: l.product
				? {
						id: l.product.id,
						code: l.product.code,
						name: l.product.name,
						categoryId: l.product.categoryId,
						category: l.product.category ?? undefined,
						unit: l.product.unit,
						stock: l.product.stock,
						minimumStock: l.product.minimumStock,
						price: Number(l.product.price),
						status: l.product.status as 'ACTIVE' | 'INACTIVE',
						createdAt: l.product.createdAt.toISOString(),
						updatedAt: l.product.updatedAt.toISOString()
					}
				: undefined
		}))
	};
}

const includeFull = {
	warehouse: true,
	lines: {
		include: {
			product: {
				include: { category: { select: { id: true, name: true } } }
			}
		}
	}
} as const;

export function cycleCountService() {
	const warehouses = warehouseRepository();

	async function generateCode(): Promise<string> {
		const now = new Date();
		const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
		const likePrefix = `CC-${yyyymm}-`;
		const latest = await db.cycleCount.findFirst({
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

	async function list() {
		const rows = await db.cycleCount.findMany({
			where: { deletedAt: null },
			orderBy: { createdAt: 'desc' },
			include: {
				warehouse: true,
				lines: { select: { id: true } }
			}
		});
		return rows.map((r) => ({
			id: r.id,
			code: r.code,
			warehouseId: r.warehouseId,
			warehouse: r.warehouse
				? {
						id: r.warehouse.id,
						code: r.warehouse.code,
						name: r.warehouse.name,
						isDefault: r.warehouse.isDefault
					}
				: undefined,
			status: r.status as CycleCount['status'],
			note: r.note,
			createdById: r.createdById,
			postedAt: r.postedAt?.toISOString() ?? null,
			createdAt: r.createdAt.toISOString(),
			lineCount: r.lines.length
		}));
	}

	async function getById(id: string) {
		const row = await db.cycleCount.findFirst({
			where: { id, deletedAt: null },
			include: includeFull
		});
		return row ? mapCycleCount(row) : null;
	}

	async function create(
		input: {
			warehouseId?: string;
			note?: string | null;
			lines: CycleCountLineInput[];
		},
		createdById?: string | null
	) {
		if (!Array.isArray(input.lines) || input.lines.length === 0) {
			return { success: false as const, errors: { form: ['At least one line is required'] } };
		}

		let warehouseId = input.warehouseId;
		if (!warehouseId) {
			const def = await warehouses.findDefault();
			warehouseId = def?.id;
		}
		if (!warehouseId) {
			return { success: false as const, errors: { warehouseId: ['Warehouse is required'] } };
		}

		const warehouse = await warehouses.findById(warehouseId);
		if (!warehouse) {
			return { success: false as const, errors: { warehouseId: ['Warehouse not found'] } };
		}

		const parsed: { productId: string; systemQty: number; countedQty: number; variance: number }[] =
			[];

		for (const line of input.lines) {
			const productId = String(line.productId);
			const countedQty = Number(line.countedQty);
			if (!productId || Number.isNaN(countedQty) || countedQty < 0) {
				return {
					success: false as const,
					errors: { form: ['Each line needs a product and non-negative counted qty'] }
				};
			}

			const product = await db.product.findFirst({
				where: { id: productId, deletedAt: null }
			});
			if (!product) {
				return { success: false as const, errors: { form: [`Product not found: ${productId}`] } };
			}

			let systemQty =
				line.systemQty !== undefined && !Number.isNaN(Number(line.systemQty))
					? Number(line.systemQty)
					: undefined;

			if (systemQty === undefined) {
				const ps = await db.productStock.findUnique({
					where: { productId_warehouseId: { productId, warehouseId } }
				});
				systemQty = ps?.qty ?? product.stock;
			}

			parsed.push({
				productId,
				systemQty,
				countedQty,
				variance: countedQty - systemQty
			});
		}

		const code = await generateCode();
		const created = await db.cycleCount.create({
			data: {
				code,
				warehouseId,
				note: input.note?.trim() || null,
				createdById,
				status: 'DRAFT',
				lines: {
					create: parsed.map((l) => ({
						productId: l.productId,
						systemQty: l.systemQty,
						countedQty: l.countedQty,
						variance: l.variance
					}))
				}
			},
			include: includeFull
		});

		return { success: true as const, data: mapCycleCount(created) };
	}

	async function updateDraft(
		id: string,
		input: {
			note?: string | null;
			lines?: CycleCountLineInput[];
		}
	) {
		const existing = await db.cycleCount.findFirst({
			where: { id, deletedAt: null },
			include: { lines: true }
		});
		if (!existing) {
			return { success: false as const, errors: { form: ['Cycle count not found'] } };
		}
		if (existing.status !== 'DRAFT') {
			return { success: false as const, errors: { form: ['Only draft cycle counts can be edited'] } };
		}

		if (input.lines) {
			if (input.lines.length === 0) {
				return { success: false as const, errors: { form: ['At least one line is required'] } };
			}

			const parsed: {
				productId: string;
				systemQty: number;
				countedQty: number;
				variance: number;
			}[] = [];
			for (const line of input.lines) {
				const productId = String(line.productId);
				const countedQty = Number(line.countedQty);
				if (!productId || Number.isNaN(countedQty) || countedQty < 0) {
					return {
						success: false as const,
						errors: { form: ['Each line needs a product and non-negative counted qty'] }
					};
				}
				const product = await db.product.findFirst({
					where: { id: productId, deletedAt: null }
				});
				if (!product) {
					return {
						success: false as const,
						errors: { form: [`Product not found: ${productId}`] }
					};
				}
				const ps = await db.productStock.findUnique({
					where: {
						productId_warehouseId: { productId, warehouseId: existing.warehouseId }
					}
				});
				const systemQty =
					line.systemQty !== undefined && !Number.isNaN(Number(line.systemQty))
						? Number(line.systemQty)
						: (ps?.qty ?? product.stock);
				parsed.push({
					productId,
					systemQty,
					countedQty,
					variance: countedQty - systemQty
				});
			}

			await db.$transaction(async (tx) => {
				await tx.cycleCountLine.deleteMany({ where: { cycleCountId: id } });
				await tx.cycleCount.update({
					where: { id },
					data: {
						note: input.note !== undefined ? input.note?.trim() || null : existing.note,
						lines: { create: parsed }
					}
				});
			});
		} else if (input.note !== undefined) {
			await db.cycleCount.update({
				where: { id },
				data: { note: input.note?.trim() || null }
			});
		}

		const refreshed = await getById(id);
		return { success: true as const, data: refreshed };
	}

	async function post(id: string, createdBy?: string | null) {
		const existing = await db.cycleCount.findFirst({
			where: { id, deletedAt: null },
			include: { lines: true }
		});
		if (!existing) {
			return { success: false as const, errors: { form: ['Cycle count not found'] } };
		}
		if (existing.status !== 'DRAFT') {
			return { success: false as const, errors: { form: ['Only draft cycle counts can be posted'] } };
		}

		try {
			await db.$transaction(async (tx) => {
				for (const line of existing.lines) {
					if (line.variance === 0) continue;

					const product = await tx.product.findFirst({
						where: { id: line.productId, deletedAt: null }
					});
					if (!product) throw new Error('PRODUCT_NOT_FOUND');

					const whQty = await getWarehouseQty(
						tx,
						product.id,
						existing.warehouseId,
						product.stock
					);
					const delta = line.countedQty - whQty;
					const stockAfter = product.stock + delta;
					if (stockAfter < 0) {
						throw new Error(`NEGATIVE:${product.code}`);
					}

					await tx.stockTransaction.create({
						data: {
							productId: product.id,
							type: 'ADJUSTMENT',
							source: 'CYCLE_COUNT',
							referenceId: existing.id,
							warehouseId: existing.warehouseId,
							qty: delta,
							stockBefore: product.stock,
							stockAfter,
							note: `Cycle count ${existing.code}`,
							createdBy
						}
					});

					await tx.product.update({
						where: { id: product.id },
						data: { stock: stockAfter }
					});

					await setProductStockQty(tx, product.id, existing.warehouseId, line.countedQty);
				}

				await tx.cycleCount.update({
					where: { id },
					data: { status: 'POSTED', postedAt: new Date() }
				});
			});
		} catch (e) {
			if (e instanceof Error) {
				if (e.message === 'PRODUCT_NOT_FOUND') {
					return { success: false as const, errors: { form: ['Product not found'] } };
				}
				if (e.message.startsWith('NEGATIVE:')) {
					return {
						success: false as const,
						errors: {
							form: [`Posting would leave negative stock for ${e.message.split(':')[1]}`]
						}
					};
				}
			}
			throw e;
		}

		const refreshed = await getById(id);
		return { success: true as const, data: refreshed };
	}

	async function cancel(id: string) {
		const existing = await db.cycleCount.findFirst({
			where: { id, deletedAt: null }
		});
		if (!existing) {
			return { success: false as const, errors: { form: ['Cycle count not found'] } };
		}
		if (existing.status !== 'DRAFT') {
			return {
				success: false as const,
				errors: { form: ['Only draft cycle counts can be cancelled'] }
			};
		}

		await db.cycleCount.update({
			where: { id },
			data: { status: 'CANCELLED' }
		});

		const refreshed = await getById(id);
		return { success: true as const, data: refreshed };
	}

	return { list, getById, create, updateDraft, post, cancel };
}
