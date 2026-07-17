import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSessionCookie, verifyPassword } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { email, password } = body;

		if (!email || !password) {
			throw error(400, { message: 'Email and password are required' });
		}

		const user = await db.user.findUnique({ where: { email } });
		if (!user || !(await verifyPassword(password, user.password))) {
			throw error(401, { message: 'Invalid email or password' });
		}

		createSessionCookie(cookies, user.id);

		return json({
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role
			}
		});
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		throw error(500, { message: 'Internal server error' });
	}
};
