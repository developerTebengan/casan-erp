import { error } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/auth';
import { stockTransactionService } from '$lib/server/services/stockTransaction.service';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	await requirePermission(cookies, 'stock:view');
	const tx = await stockTransactionService().getById(params.id);
	if (!tx) throw error(404, 'Stock transaction not found');

	let purchase: { id: string; prNumber: string } | null = null;
	if (tx.source === 'PURCHASE' && tx.referenceId) {
		const p = await db.purchase.findFirst({
			where: { id: tx.referenceId, deletedAt: null },
			select: { id: true, prNumber: true }
		});
		purchase = p;
	}

	const alreadyReversed = Boolean(
		tx.note?.includes('[REVERSED]') ||
			(await db.stockTransaction.findFirst({
				where: { deletedAt: null, note: { startsWith: `Reversal of ${tx.id}` } },
				select: { id: true }
			}))
	);

	const isReversal = Boolean(tx.note?.startsWith('Reversal of '));

	return { tx, purchase, alreadyReversed, isReversal };
};
