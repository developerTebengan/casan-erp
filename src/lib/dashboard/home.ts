import type { UserRole } from '$lib/types';

export function homeFor(role: UserRole): 'queue' | 'mine' | 'ops' {
	if (role === 'ADMIN') return 'ops';
	if (role === 'USER') return 'mine';
	return 'queue';
}

function ymd(value: string | Date): string {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	return new Date(value).toISOString().slice(0, 10);
}

export function isQueueOverdue(
	item: { decisionDeadline: string; approvalStatus?: string },
	now = new Date()
): boolean {
	if (item.approvalStatus && item.approvalStatus !== 'PENDING') return false;
	return ymd(item.decisionDeadline) < ymd(now);
}

export function sortQueueOverdueFirst<
	T extends { decisionDeadline: string; approvalStatus?: string }
>(items: T[], now = new Date()): T[] {
	return [...items].sort((a, b) => {
		const aOver = isQueueOverdue(a, now);
		const bOver = isQueueOverdue(b, now);
		if (aOver === bOver) return 0;
		return aOver ? -1 : 1;
	});
}
