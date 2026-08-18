import { describe, it, expect } from 'vitest';
import { nextPaidDefault } from './paid-default';

describe('nextPaidDefault', () => {
	it('fills catalog total when paid is empty', () => {
		expect(nextPaidDefault('', 100_000, 0)).toBe('100000');
	});

	it('follows catalog when paid still equals the previous catalog total', () => {
		expect(nextPaidDefault('100000', 200_000, 100_000)).toBe('200000');
	});

	it('keeps a custom paid amount', () => {
		expect(nextPaidDefault('80000', 200_000, 100_000)).toBe('80000');
	});

	it('clears when there is no catalog total yet', () => {
		expect(nextPaidDefault('', 0, 0)).toBe('');
	});
});
