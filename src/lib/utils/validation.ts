export type ValidationErrors = Record<string, string[]>;

export interface ValidationResult<T> {
	valid: boolean;
	data?: T;
	errors?: ValidationErrors;
}

export function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (typeof value === 'number') return false;
	return true;
}

export function validateRequired(
	data: Record<string, unknown>,
	fields: string[]
): ValidationErrors {
	const errors: ValidationErrors = {};
	for (const field of fields) {
		if (isEmpty(data[field])) {
			errors[field] = [`${field} is required`];
		}
	}
	return errors;
}

export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
