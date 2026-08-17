import { describe, it, expect } from 'vitest';
import {
	agreementProgress,
	applyFulfillment,
	fullyReceivedFromLines,
	purchaseListStatus
} from './list-status';
import type { Purchase } from '$lib/types';

const base = {
	departmentHeadId: 'dh',
	departmentHeadStatus: 'APPROVED' as const,
	financeApproverId: 'fin',
	financeStatus: 'APPROVED' as const,
	finalApproverId: 'dir',
	finalStatus: 'PENDING' as const
};

describe('agreementProgress', () => {
	it('counts assigned approvers and approvals', () => {
		const progress = agreementProgress(base);
		expect(progress.assigned).toBe(3);
		expect(progress.approved).toBe(2);
	});

	it('skips unassigned levels', () => {
		const progress = agreementProgress({
			...base,
			finalApproverId: null,
			finalStatus: 'PENDING'
		});
		expect(progress.assigned).toBe(2);
		expect(progress.approved).toBe(2);
	});
});

describe('purchaseListStatus', () => {
	it('is waiting until fully received', () => {
		expect(purchaseListStatus({ approvalStatus: 'PENDING' })).toBe('WAITING');
		expect(purchaseListStatus({ approvalStatus: 'APPROVED', fullyReceived: false })).toBe(
			'WAITING'
		);
	});

	it('is stock in when approved and fully received', () => {
		expect(purchaseListStatus({ approvalStatus: 'APPROVED', fullyReceived: true })).toBe(
			'STOCK_IN'
		);
	});

	it('is rejected when rejected', () => {
		expect(purchaseListStatus({ approvalStatus: 'REJECTED' })).toBe('REJECTED');
	});
});

describe('fullyReceivedFromLines', () => {
	it('requires every ordered line to be covered', () => {
		expect(
			fullyReceivedFromLines(
				[
					{ productId: 'a', qty: 2 },
					{ productId: 'b', qty: 1 }
				],
				[{ productId: 'a', qty: 2 }]
			)
		).toBe(false);
		expect(
			fullyReceivedFromLines(
				[
					{ productId: 'a', qty: 2 },
					{ productId: 'b', qty: 1 }
				],
				[
					{ productId: 'a', qty: 2 },
					{ productId: 'b', qty: 1 }
				]
			)
		).toBe(true);
	});
});

describe('applyFulfillment', () => {
	it('sets fullyReceived on matching purchases', () => {
		const purchases = [{ id: 'p1' }, { id: 'p2' }] as Purchase[];
		const result = applyFulfillment(
			purchases,
			[
				{ purchaseId: 'p1', productId: 'a', qty: 1 },
				{ purchaseId: 'p2', productId: 'a', qty: 1 }
			],
			[{ purchaseId: 'p1', productId: 'a', qty: 1 }]
		);
		expect(result[0].fullyReceived).toBe(true);
		expect(result[1].fullyReceived).toBe(false);
	});
});
