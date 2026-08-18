export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
	function cell(value: string | number | null | undefined) {
		const text = value == null ? '' : String(value);
		return `"${text.replace(/"/g, '""')}"`;
	}
	const lines = [headers.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))];
	return `\uFEFF${lines.join('\r\n')}`;
}

export function csvFileResponse(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
	return new Response(toCsv(headers, rows), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
}
