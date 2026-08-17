export type PurchaseEvent = 'created' | 'approved' | 'rejected';

export type NotificationType = 'PR_WAITING' | 'PR_DECIDED';

export interface PurchaseNotificationInput {
	id: string;
	prNumber: string;
	requesterId: string;
	departmentHeadId?: string | null;
	financeApproverId?: string | null;
	finalApproverId?: string | null;
	departmentHeadStatus: string;
	financeStatus: string;
	finalStatus: string;
}

export interface PurchaseNotificationTarget {
	userId: string;
	type: NotificationType;
	titleKey: string;
	bodyKey: string;
	params: Record<string, string>;
	href: string;
}

function actionableApproverId(purchase: PurchaseNotificationInput): string | null {
	const levels = [
		{ id: purchase.departmentHeadId, status: purchase.departmentHeadStatus },
		{ id: purchase.financeApproverId, status: purchase.financeStatus },
		{ id: purchase.finalApproverId, status: purchase.finalStatus }
	];
	for (const level of levels) {
		if (level.status === 'PENDING' && level.id) return level.id;
	}
	return null;
}

function target(
	purchase: PurchaseNotificationInput,
	userId: string,
	type: NotificationType
): PurchaseNotificationTarget {
	const key = type === 'PR_WAITING' ? 'notify.waiting' : 'notify.decided';
	return {
		userId,
		type,
		titleKey: key,
		bodyKey: key,
		params: { prNumber: purchase.prNumber },
		href: `/purchasing/${purchase.id}`
	};
}

export function targetsForPurchaseEvent(
	event: PurchaseEvent,
	purchase: PurchaseNotificationInput
): PurchaseNotificationTarget[] {
	if (event === 'created') {
		const approverId = actionableApproverId(purchase);
		return approverId ? [target(purchase, approverId, 'PR_WAITING')] : [];
	}

	if (event === 'rejected') {
		return [target(purchase, purchase.requesterId, 'PR_DECIDED')];
	}

	const targets: PurchaseNotificationTarget[] = [
		target(purchase, purchase.requesterId, 'PR_DECIDED')
	];
	const nextApproverId = actionableApproverId(purchase);
	if (nextApproverId) {
		targets.push(target(purchase, nextApproverId, 'PR_WAITING'));
	}
	return targets;
}
