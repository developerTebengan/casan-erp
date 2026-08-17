import { describe, it, expect } from 'vitest';
import { homeFor, sortQueueOverdueFirst } from './home';

describe('homeFor', () => {
	it('sends ADMIN to ops, USER to mine, and everyone else to queue', () => {
		expect(homeFor('ADMIN')).toBe('ops');
		expect(homeFor('USER')).toBe('mine');
		expect(homeFor('DEPARTMENT_HEAD')).toBe('queue');
		expect(homeFor('FINANCE')).toBe('queue');
		expect(homeFor('MANAGER')).toBe('queue');
		expect(homeFor('DIRECTOR')).toBe('queue');
	});
});

describe('sortQueueOverdueFirst', () => {
	const now = new Date('2026-08-17T01:00:00.000Z');

	it('puts pending overdue deadlines before the rest of the page', () => {
		const sorted = sortQueueOverdueFirst(
			[
				{ id: 'ok', decisionDeadline: '2026-08-20T00:00:00.000Z', approvalStatus: 'PENDING' },
				{ id: 'late', decisionDeadline: '2026-08-10T00:00:00.000Z', approvalStatus: 'PENDING' },
				{
					id: 'done-late',
					decisionDeadline: '2026-08-01T00:00:00.000Z',
					approvalStatus: 'APPROVED'
				}
			],
			now
		);
		expect(sorted.map((row) => row.id)).toEqual(['late', 'ok', 'done-late']);
	});
});
