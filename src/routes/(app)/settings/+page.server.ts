import { requirePermission } from '$lib/server/auth';
import { settingsService } from '$lib/server/services/settings.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const user = await requirePermission(cookies, 'settings:view');
	const settings = await settingsService().get();
	return { settings, user };
};
