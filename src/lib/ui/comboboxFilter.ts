export interface ComboboxOption {
	value: string;
	label: string;
}

export function filterOptions(options: ComboboxOption[], query: string): ComboboxOption[] {
	const q = query.trim().toLowerCase();
	if (!q) return options;
	return options.filter((option) => option.label.toLowerCase().includes(q));
}
