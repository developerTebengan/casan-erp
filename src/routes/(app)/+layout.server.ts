import { requireAuth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const user = await requireAuth(cookies);
	return { user };
};
