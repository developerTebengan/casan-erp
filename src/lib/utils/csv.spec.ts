import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
	it('quotes cells and prefixes a UTF-8 BOM for Excel', () => {
		const csv = toCsv(['Name', 'Qty'], [['Floor "A"', 2]]);
		expect(csv.startsWith('\uFEFF')).toBe(true);
		expect(csv).toContain('"Name","Qty"');
		expect(csv).toContain('"Floor ""A""","2"');
	});
});
