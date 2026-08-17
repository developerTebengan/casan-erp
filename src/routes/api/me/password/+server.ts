import { json, error } from '@sveltejs/kit';
import { userService, validatePasswordChange } from '$lib/server/services/user.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ message: 'Invalid JSON' }, { status: 400 });
		}

		if (body === null || typeof body !== 'object' || Array.isArray(body)) {
			return json({ message: 'Invalid payload' }, { status: 400 });
		}

		const payload = body as Record<string, unknown>;
		const currentPassword = String(payload.currentPassword ?? '');
		const newPassword = String(payload.newPassword ?? '');
		const confirmPassword = String(payload.confirmPassword ?? '');

		const validation = validatePasswordChange(currentPassword, newPassword, confirmPassword);
		if (!validation.valid) {
			return json({ message: 'Validation failed', errors: validation.errors }, { status: 400 });
		}

		const result = await userService().changePassword(locals.user.id, currentPassword, newPassword);
		if (!result.success) {
			return json(
				{
					message: 'Invalid current password',
					errors: { currentPassword: ['Invalid current password'] }
				},
				{ status: 401 }
			);
		}

		return json({ ok: true });
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to change password' });
	}
};
