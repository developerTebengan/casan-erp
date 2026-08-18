import { describe, it, expect } from 'vitest';
import { dayRange } from './dayRange';

describe('dayRange', () => {
	it('treats from/to as inclusive Jakarta calendar days', () => {
		const range = dayRange('2026-08-18', '2026-08-18');
		expect(range?.gte?.toISOString()).toBe('2026-08-17T17:00:00.000Z');
		expect(range?.lte?.toISOString()).toBe('2026-08-18T16:59:59.999Z');
	});

	it('returns undefined when both dates are empty', () => {
		expect(dayRange(undefined, undefined)).toBeUndefined();
	});

	it('can open on one side', () => {
		const fromOnly = dayRange('2026-08-01', undefined);
		expect(fromOnly?.gte).toBeInstanceOf(Date);
		expect(fromOnly?.lte).toBeUndefined();
		const toOnly = dayRange(undefined, '2026-08-31');
		expect(toOnly?.gte).toBeUndefined();
		expect(toOnly?.lte).toBeInstanceOf(Date);
	});
});
