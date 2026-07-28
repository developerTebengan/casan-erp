import { requirePermission } from '$lib/server/auth';
import { userService } from '$lib/server/services/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	await requirePermission(cookies, 'users:manage');
	const users = await userService().list();
	return { users };
};
