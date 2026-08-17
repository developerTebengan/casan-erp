import { db } from '$lib/server/db';

const DEFAULT_ID = 'default';

export interface CompanySettingsInput {
	companyName: string;
	email: string;
	phone: string;
	taxId: string;
	address: string;
	currency: string;
	dateFormat: string;
	itemsPerPage: number;
}

export interface CompanySettings extends CompanySettingsInput {
	id: string;
	updatedAt: string;
}

export function settingsRepository() {
	async function get(): Promise<CompanySettings | null> {
		const row = await db.companySettings.findUnique({ where: { id: DEFAULT_ID } });
		return row ? mapSettings(row) : null;
	}

	async function upsert(input: CompanySettingsInput): Promise<CompanySettings> {
		const row = await db.companySettings.upsert({
			where: { id: DEFAULT_ID },
			create: { id: DEFAULT_ID, ...input },
			update: input
		});
		return mapSettings(row);
	}

	return { get, upsert };
}

function mapSettings(row: {
	id: string;
	companyName: string;
	email: string;
	phone: string;
	taxId: string;
	address: string;
	currency: string;
	dateFormat: string;
	itemsPerPage: number;
	updatedAt: Date;
}): CompanySettings {
	return {
		id: row.id,
		companyName: row.companyName,
		email: row.email,
		phone: row.phone,
		taxId: row.taxId,
		address: row.address,
		currency: row.currency,
		dateFormat: row.dateFormat,
		itemsPerPage: row.itemsPerPage,
		updatedAt: row.updatedAt.toISOString()
	};
}
