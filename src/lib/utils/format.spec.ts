import { describe, expect, it } from 'vitest';
import { formatNumber, parseIdNumber } from './format';

describe('IDR number input', () => {
	it('formats with thousand separators', () => {
		expect(formatNumber(45000)).toBe('45.000');
		expect(formatNumber(1234567)).toBe('1.234.567');
	});

	it('parses formatted id-ID strings back to numbers', () => {
		expect(parseIdNumber('45.000')).toBe(45000);
		expect(parseIdNumber('1.234.567')).toBe(1234567);
		expect(parseIdNumber('0')).toBe(0);
		expect(parseIdNumber('')).toBe(0);
	});
});
