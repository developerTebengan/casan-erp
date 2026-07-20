import { fail, redirect, type Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSessionCookie, verifyPassword } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		const errors: Record<string, string> = {};
		if (!email) errors.email = 'Email is required';
		if (!password) errors.password = 'Password is required';

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, email });
		}

		try {
			const user = await db.user.findUnique({ where: { email } });
			if (!user || !(await verifyPassword(password, user.password))) {
				return fail(401, { errors: { form: 'Invalid email or password' }, email });
			}

			createSessionCookie(cookies, user.id);
			throw redirect(303, '/dashboard');
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
				return fail(503, {
					errors: { form: 'Database connection failed. Please make sure PostgreSQL is running.' },
					email
				});
			}
			throw error;
		}
	}
};
