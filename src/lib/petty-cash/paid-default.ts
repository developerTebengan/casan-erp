export function nextPaidDefault(paid: string, expected: number, previousExpected: number): string {
	const n = Number(paid);
	const untouched = paid === '' || n === previousExpected;
	if (!untouched) return paid;
	return expected > 0 ? String(expected) : '';
}
