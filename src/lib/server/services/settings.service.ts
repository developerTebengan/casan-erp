import {
	settingsRepository,
	type CompanySettings,
	type CompanySettingsInput
} from '$lib/server/repositories/settings.repository';
import { isEmail, validateRequired, type ValidationErrors } from '$lib/utils/validation';

const ALLOWED_PAGE_SIZES = [10, 25, 50];

export type SettingsValidationResult =
	| { valid: true; data: CompanySettingsInput }
	| { valid: false; errors: ValidationErrors };

export function validateSettings(input: Record<string, unknown>): SettingsValidationResult {
	const errors: ValidationErrors = {
		...validateRequired(input, [
			'companyName',
			'email',
			'phone',
			'taxId',
			'address',
			'currency',
			'dateFormat'
		])
	};

	const email = typeof input.email === 'string' ? input.email.trim() : '';
	if (email && !isEmail(email)) {
		errors.email = ['email is invalid'];
	}

	const itemsPerPage = Number(input.itemsPerPage);
	if (!ALLOWED_PAGE_SIZES.includes(itemsPerPage)) {
		errors.itemsPerPage = ['itemsPerPage must be 10, 25, or 50'];
	}

	if (Object.keys(errors).length > 0) {
		return { valid: false, errors };
	}

	return {
		valid: true,
		data: {
			companyName: String(input.companyName).trim(),
			email,
			phone: String(input.phone).trim(),
			taxId: String(input.taxId).trim(),
			address: String(input.address).trim(),
			currency: String(input.currency).trim(),
			dateFormat: String(input.dateFormat).trim(),
			itemsPerPage
		}
	};
}

export function settingsService() {
	const repo = settingsRepository();

	async function get(): Promise<CompanySettings> {
		const settings = await repo.get();
		if (!settings) {
			throw new Error('Company settings not found');
		}
		return settings;
	}

	async function update(input: Record<string, unknown>) {
		const validation = validateSettings(input);
		if (!validation.valid) return validation;

		const data = await repo.upsert(validation.data);
		return { valid: true as const, data };
	}

	return { get, update };
}
