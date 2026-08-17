import type { ApprovalStatus, Purchase } from '$lib/types';

export type PurchaseListStatus = 'WAITING' | 'PARTIAL' | 'STOCK_IN' | 'REJECTED';

export interface AgreementLevel {
	key: 'departmentHead' | 'finance' | 'final';
	status: ApprovalStatus;
}

export interface AgreementProgress {
	approved: number;
	assigned: number;
	levels: AgreementLevel[];
}

export function agreementProgress(p: {
	departmentHeadId?: string | null;
	departmentHeadStatus: ApprovalStatus;
	financeApproverId?: string | null;
	financeStatus: ApprovalStatus;
	finalApproverId?: string | null;
	finalStatus: ApprovalStatus;
}): AgreementProgress {
	const levels: AgreementLevel[] = [];
	if (p.departmentHeadId) {
		levels.push({ key: 'departmentHead', status: p.departmentHeadStatus });
	}
	if (p.financeApproverId) {
		levels.push({ key: 'finance', status: p.financeStatus });
	}
	if (p.finalApproverId) {
		levels.push({ key: 'final', status: p.finalStatus });
	}
	return {
		assigned: levels.length,
		approved: levels.filter((l) => l.status === 'APPROVED').length,
		levels
	};
}

export function purchaseListStatus(p: {
	approvalStatus: ApprovalStatus;
	fullyReceived?: boolean;
	partiallyReceived?: boolean;
}): PurchaseListStatus {
	if (p.approvalStatus === 'REJECTED') return 'REJECTED';
	if (p.approvalStatus === 'APPROVED' && p.fullyReceived) return 'STOCK_IN';
	if (p.approvalStatus === 'APPROVED' && p.partiallyReceived) return 'PARTIAL';
	return 'WAITING';
}

export function fullyReceivedFromLines(
	ordered: { productId: string; qty: number }[],
	received: { productId: string; qty: number }[]
): boolean {
	if (ordered.length === 0) return false;
	const receivedMap: Record<string, number> = {};
	for (const row of received) {
		receivedMap[row.productId] = (receivedMap[row.productId] ?? 0) + Math.abs(row.qty);
	}
	return ordered.every((item) => (receivedMap[item.productId] ?? 0) >= item.qty);
}

export function partiallyReceivedFromLines(
	ordered: { productId: string; qty: number }[],
	received: { productId: string; qty: number }[]
): boolean {
	if (ordered.length === 0) return false;
	if (fullyReceivedFromLines(ordered, received)) return false;
	const receivedMap: Record<string, number> = {};
	for (const row of received) {
		receivedMap[row.productId] = (receivedMap[row.productId] ?? 0) + Math.abs(row.qty);
	}
	return ordered.some((item) => (receivedMap[item.productId] ?? 0) > 0);
}

export function applyFulfillment(
	purchases: Purchase[],
	ordered: { purchaseId: string; productId: string; qty: number }[],
	received: { purchaseId: string; productId: string; qty: number }[]
): Purchase[] {
	return purchases.map((p) => {
		const orderedLines = ordered.filter((row) => row.purchaseId === p.id);
		const receivedLines = received.filter((row) => row.purchaseId === p.id);
		return {
			...p,
			fullyReceived: fullyReceivedFromLines(orderedLines, receivedLines),
			partiallyReceived: partiallyReceivedFromLines(orderedLines, receivedLines)
		};
	});
}
