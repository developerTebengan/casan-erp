import { userService } from '$lib/server/services/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const users = await userService().list();
	return { users };
};
