import { db } from '$lib/server/db';
import type {
	StockTransaction as IStockTransaction,
	StockTransactionType,
	StockTransactionSource,
	Product
} from '$lib/types';

export interface StockTransactionFilters {
	search?: string;
	productId?: string;
	type?: StockTransactionType;
	page?: number;
	limit?: number;
}

export interface StockTransactionCreateInput {
	productId: string;
	type: StockTransactionType;
	source?: StockTransactionSource;
	referenceId?: string | null;
	qty: number;
	stockBefore: number;
	stockAfter: number;
	note?: string | null;
	createdBy?: string | null;
}

export function stockTransactionRepository() {
	async function findAll(filters: StockTransactionFilters = {}) {
		const { search, productId, type, page = 1, limit = 10 } = filters;

		const where: Record<string, unknown> = { deletedAt: null };
		if (productId) where.productId = productId;
		if (type) where.type = type;
		if (search) {
			where.OR = [
				{ product: { name: { contains: search, mode: 'insensitive' } } },
				{ product: { code: { contains: search, mode: 'insensitive' } } }
			];
		}

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			db.stockTransaction.findMany({
				where,
				skip,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: {
					product: {
						include: { category: { select: { id: true, name: true } } }
					}
				}
			}),
			db.stockTransaction.count({ where })
		]);

		return {
			data: data.map(mapStockTransaction),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
		};
	}

	async function listForExport(filters: Omit<StockTransactionFilters, 'page' | 'limit'> = {}) {
		const { search, productId, type } = filters;
		const where: Record<string, unknown> = { deletedAt: null };
		if (productId) where.productId = productId;
		if (type) where.type = type;
		if (search) {
			where.OR = [
				{ product: { name: { contains: search, mode: 'insensitive' } } },
				{ product: { code: { contains: search, mode: 'insensitive' } } }
			];
		}
		const data = await db.stockTransaction.findMany({
			where,
			take: 5000,
			orderBy: { createdAt: 'desc' },
			include: {
				product: {
					include: { category: { select: { id: true, name: true } } }
				}
			}
		});
		return data.map(mapStockTransaction);
	}

	async function findById(id: string): Promise<IStockTransaction | null> {
		const tx = await db.stockTransaction.findFirst({
			where: { id, deletedAt: null },
			include: {
				product: {
					include: { category: { select: { id: true, name: true } } }
				}
			}
		});
		return tx ? mapStockTransaction(tx) : null;
	}

	async function create(input: StockTransactionCreateInput) {
		const tx = await db.stockTransaction.create({
			data: {
				productId: input.productId,
				type: input.type,
				source: input.source ?? 'MANUAL',
				referenceId: input.referenceId,
				qty: input.qty,
				stockBefore: input.stockBefore,
				stockAfter: input.stockAfter,
				note: input.note,
				createdBy: input.createdBy
			},
			include: {
				product: {
					include: { category: { select: { id: true, name: true } } }
				}
			}
		});
		return mapStockTransaction(tx);
	}

	return { findAll, listForExport, findById, create };
}

function mapStockTransaction(tx: {
	id: string;
	productId: string;
	product?: {
		id: string;
		code: string;
		name: string;
		categoryId: string;
		category?: { id: string; name: string } | null;
		unit: string;
		stock: number;
		minimumStock: number;
		price: unknown;
		status: string;
		createdAt: Date;
		updatedAt: Date;
	} | null;
	type: string;
	source: string;
	referenceId: string | null;
	qty: number;
	stockBefore: number;
	stockAfter: number;
	note: string | null;
	createdBy: string | null;
	createdAt: Date;
}): IStockTransaction {
	const product: Product | undefined = tx.product
		? {
				id: tx.product.id,
				code: tx.product.code,
				name: tx.product.name,
				categoryId: tx.product.categoryId,
				category: tx.product.category ?? undefined,
				unit: tx.product.unit,
				stock: tx.product.stock,
				minimumStock: tx.product.minimumStock,
				price: Number(tx.product.price),
				status: tx.product.status as Product['status'],
				createdAt: tx.product.createdAt.toISOString(),
				updatedAt: tx.product.updatedAt.toISOString()
			}
		: undefined;

	return {
		id: tx.id,
		productId: tx.productId,
		product,
		type: tx.type as StockTransactionType,
		source: tx.source as StockTransactionSource,
		referenceId: tx.referenceId,
		qty: tx.qty,
		stockBefore: tx.stockBefore,
		stockAfter: tx.stockAfter,
		note: tx.note,
		createdBy: tx.createdBy,
		createdAt: tx.createdAt.toISOString()
	};
}
