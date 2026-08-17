import { describe, it, expect } from 'vitest';
import { targetsForPurchaseEvent } from './targets';

const base = {
	id: 'p1',
	prNumber: 'PR-2026-001',
	requesterId: 'req',
	departmentHeadId: 'dh',
	financeApproverId: 'fin',
	finalApproverId: 'dir',
	departmentHeadStatus: 'PENDING',
	financeStatus: 'PENDING',
	finalStatus: 'PENDING'
} as const;

describe('targetsForPurchaseEvent', () => {
	it('notifies only the current actionable approver on create', () => {
		const targets = targetsForPurchaseEvent('created', base);
		expect(targets.map((t) => t.userId)).toEqual(['dh']);
		expect(targets[0].type).toBe('PR_WAITING');
	});

	it('notifies requester on reject and next approver on approve', () => {
		const afterDh = { ...base, departmentHeadStatus: 'APPROVED' as const };
		const approved = targetsForPurchaseEvent('approved', afterDh);
		expect(approved.some((t) => t.userId === 'req' && t.type === 'PR_DECIDED')).toBe(true);
		expect(approved.some((t) => t.userId === 'fin' && t.type === 'PR_WAITING')).toBe(true);

		const rejected = targetsForPurchaseEvent('rejected', {
			...base,
			departmentHeadStatus: 'REJECTED'
		});
		expect(rejected.map((t) => t.userId)).toEqual(['req']);
	});
});
