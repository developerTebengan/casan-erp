import { redirect, type Cookies } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from './db';
import type { User } from '$lib/types';

const SESSION_SECRET =
	process.env.SESSION_SECRET ?? 'casan-erp-development-secret-change-in-production';
const SESSION_COOKIE = 'casan-session';

function sign(value: string): string {
	return createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function verify(value: string, signature: string): boolean {
	try {
		const expected = sign(value);
		const expectedBuf = Buffer.from(expected);
		const signatureBuf = Buffer.from(signature);
		return expectedBuf.length === signatureBuf.length && timingSafeEqual(expectedBuf, signatureBuf);
	} catch {
		return false;
	}
}

export function createSessionCookie(cookies: Cookies, userId: string) {
	const signature = sign(userId);
	const value = `${userId}:${signature}`;
	cookies.set(SESSION_COOKIE, value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function getCurrentUser(cookies: Cookies): Promise<User | null> {
	const cookie = cookies.get(SESSION_COOKIE);
	if (!cookie) return null;

	const [userId, signature] = cookie.split(':');
	if (!userId || !signature || !verify(userId, signature)) return null;

	const user = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, email: true, role: true }
	});

	if (!user) return null;
	return user;
}

export async function requireAuth(cookies: Cookies): Promise<User> {
	const user = await getCurrentUser(cookies);
	if (!user) {
		throw redirect(303, '/login');
	}
	return user;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
	return bcrypt.compare(plain, hashed);
}

export async function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, 10);
}
