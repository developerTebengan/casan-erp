import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getCurrentUser } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

const authHandle: Handle = async ({ event, resolve }) => {
	const { cookies, url } = event;
	const user = await getCurrentUser(cookies);
	event.locals.user = user;

	const isPublic =
		PUBLIC_ROUTES.some((route) => url.pathname.startsWith(route)) ||
		url.pathname.startsWith('/_app') ||
		url.pathname.startsWith('/api/auth');

	if (!user && !isPublic) {
		throw redirect(303, '/login');
	}

	if (user && url.pathname === '/login') {
		throw redirect(303, '/dashboard');
	}

	return resolve(event);
};

const themeHandle: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get('casan-theme');
	event.locals.theme = theme === 'dark' ? 'dark' : 'light';

	return resolve(event, {
		transformPageChunk({ html, done }) {
			if (!done) return html;
			if (event.locals.theme === 'dark') {
				return html.replace('<html', '<html class="dark"');
			}
			return html;
		}
	});
};

export const handle = sequence(authHandle, themeHandle);
