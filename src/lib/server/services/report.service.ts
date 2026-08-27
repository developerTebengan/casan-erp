import { db } from '$lib/server/db';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';

function toCsv(headers: string[], rows: (string | number)[][]): string {
	const escape = (v: string | number) => {
		const s = String(v ?? '');
		if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	};
	return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

export function reportService() {
	async function stockMovements(from?: string, to?: string) {
		const where: Record<string, unknown> = { deletedAt: null };
		if (from || to) {
			where.createdAt = {
				...(from ? { gte: new Date(from) } : {}),
				...(to ? { lte: new Date(to + 'T23:59:59.999') } : {})
			};
		}

		const txs = await db.stockTransaction.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				product: { select: { code: true, name: true, unit: true } },
				warehouse: { select: { code: true, name: true } }
			},
			take: 5000
		});

		const data = txs.map((t) => ({
			id: t.id,
			date: t.createdAt.toISOString(),
			productCode: t.product?.code ?? '',
			productName: t.product?.name ?? '',
			unit: t.product?.unit ?? '',
			type: t.type,
			source: t.source,
			qty: t.qty,
			stockBefore: t.stockBefore,
			stockAfter: t.stockAfter,
			warehouse: t.warehouse ? `${t.warehouse.code}` : '',
			note: t.note ?? '',
			referenceId: t.referenceId ?? ''
		}));

		const csv = toCsv(
			[
				'Date',
				'Product Code',
				'Product Name',
				'Type',
				'Source',
				'Qty',
				'Stock Before',
				'Stock After',
				'Warehouse',
				'Note',
				'Reference'
			],
			data.map((d) => [
				d.date,
				d.productCode,
				d.productName,
				d.type,
				d.source,
				d.qty,
				d.stockBefore,
				d.stockAfter,
				d.warehouse,
				d.note,
				d.referenceId
			])
		);

		return { data, csv };
	}

	async function lowStock() {
		const products = await db.product.findMany({
			where: { deletedAt: null, status: 'ACTIVE' },
			include: { category: { select: { name: true } } },
			orderBy: { name: 'asc' }
		});
		const data = products
			.filter((p) => p.stock <= p.minimumStock)
			.map((p) => ({
				code: p.code,
				name: p.name,
				category: p.category?.name ?? '',
				stock: p.stock,
				minimumStock: p.minimumStock,
				unit: p.unit,
				price: Number(p.price)
			}));

		const csv = toCsv(
			['Code', 'Name', 'Category', 'Stock', 'Minimum', 'Unit', 'Price'],
			data.map((d) => [d.code, d.name, d.category, d.stock, d.minimumStock, d.unit, d.price])
		);

		return { data, csv };
	}

	async function valuationByCategory() {
		const products = await db.product.findMany({
			where: { deletedAt: null, status: 'ACTIVE' },
			include: { category: { select: { id: true, name: true } } }
		});

		const map = new Map<
			string,
			{ categoryId: string; categoryName: string; productCount: number; totalQty: number; value: number }
		>();

		for (const p of products) {
			const key = p.categoryId;
			const existing = map.get(key) ?? {
				categoryId: p.categoryId,
				categoryName: p.category?.name ?? 'Uncategorized',
				productCount: 0,
				totalQty: 0,
				value: 0
			};
			existing.productCount += 1;
			existing.totalQty += p.stock;
			existing.value += p.stock * Number(p.price);
			map.set(key, existing);
		}

		const data = [...map.values()].sort((a, b) => b.value - a.value);
		const csv = toCsv(
			['Category', 'Products', 'Total Qty', 'Inventory Value'],
			data.map((d) => [d.categoryName, d.productCount, d.totalQty, d.value])
		);

		return { data, csv };
	}

	async function purchasingSpendBySupplier(from?: string, to?: string) {
		const where: Record<string, unknown> = {
			deletedAt: null,
			approvalStatus: 'APPROVED',
			supplierId: { not: null }
		};
		if (from || to) {
			where.dateOfRequest = {
				...(from ? { gte: new Date(from) } : {}),
				...(to ? { lte: new Date(to + 'T23:59:59.999') } : {})
			};
		}

		const purchases = await db.purchase.findMany({
			where,
			include: { supplier: { select: { id: true, name: true } } }
		});

		const map = new Map<
			string,
			{ supplierId: string; supplierName: string; orderCount: number; totalSpend: number }
		>();

		for (const p of purchases) {
			if (!p.supplierId || !p.supplier) continue;
			const existing = map.get(p.supplierId) ?? {
				supplierId: p.supplierId,
				supplierName: p.supplier.name,
				orderCount: 0,
				totalSpend: 0
			};
			existing.orderCount += 1;
			existing.totalSpend += Number(p.total);
			map.set(p.supplierId, existing);
		}

		const data = [...map.values()].sort((a, b) => b.totalSpend - a.totalSpend);
		const csv = toCsv(
			['Supplier', 'Orders', 'Total Spend'],
			data.map((d) => [d.supplierName, d.orderCount, d.totalSpend])
		);

		return { data, csv };
	}

	async function openOrdersAging() {
		const purchases = await db.purchase.findMany({
			where: { deletedAt: null, approvalStatus: 'APPROVED' },
			include: {
				supplier: { select: { name: true } },
				items: true
			},
			orderBy: { dateRequired: 'asc' }
		});

		const gr = goodsReceiptService();
		const ids = purchases.map((p) => p.id);
		const receivedBatch = await gr.getReceivedByProductBatch(ids);

		const data = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (const p of purchases) {
			const receivedMap = receivedBatch[p.id] ?? {};
			let orderedQty = 0;
			let receivedQty = 0;
			for (const item of p.items) {
				orderedQty += item.qty;
				receivedQty += Math.min(item.qty, receivedMap[item.productId] ?? 0);
			}
			const remainingQty = orderedQty - receivedQty;
			if (remainingQty <= 0) continue;

			const due = new Date(p.dateRequired);
			due.setHours(0, 0, 0, 0);
			const ageDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

			data.push({
				prNumber: p.prNumber,
				supplier: p.supplier?.name ?? '',
				department: p.department,
				dateRequired: p.dateRequired.toISOString(),
				orderedQty,
				receivedQty,
				remainingQty,
				ageDays,
				overdue: ageDays > 0
			});
		}

		const csv = toCsv(
			[
				'PR Number',
				'Supplier',
				'Department',
				'Date Required',
				'Ordered',
				'Received',
				'Remaining',
				'Age Days',
				'Overdue'
			],
			data.map((d) => [
				d.prNumber,
				d.supplier,
				d.department,
				d.dateRequired,
				d.orderedQty,
				d.receivedQty,
				d.remainingQty,
				d.ageDays,
				d.overdue ? 'Yes' : 'No'
			])
		);

		return { data, csv };
	}

	return {
		stockMovements,
		lowStock,
		valuationByCategory,
		purchasingSpendBySupplier,
		openOrdersAging
	};
}

export function csvResponse(filename: string, csv: string) {
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
}
