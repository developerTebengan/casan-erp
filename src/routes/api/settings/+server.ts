import { json, error } from '@sveltejs/kit';
import { settingsService } from '$lib/server/services/settings.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'settings:view')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const settings = await settingsService().get();
		return json(settings);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to load settings' });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'settings:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
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

		const result = await settingsService().update(body as Record<string, unknown>);

		if (!result.valid) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to update settings' });
	}
};
