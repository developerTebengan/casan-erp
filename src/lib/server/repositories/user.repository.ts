import { db } from '$lib/server/db';
import type { User, UserRole } from '$lib/types';

export interface UserCreateInput {
	name: string;
	email: string;
	password: string;
	role: UserRole;
}

export interface UserUpdateInput {
	name: string;
	email: string;
	role: UserRole;
	password?: string;
}

export function userRepository() {
	async function findAll(): Promise<User[]> {
		const users = await db.user.findMany({
			orderBy: { name: 'asc' },
			select: { id: true, name: true, email: true, role: true }
		});
		return users.map((u) => ({ ...u, role: u.role as UserRole }));
	}

	async function findById(id: string): Promise<User | null> {
		const user = await db.user.findUnique({
			where: { id },
			select: { id: true, name: true, email: true, role: true }
		});
		return user ? { ...user, role: user.role as UserRole } : null;
	}

	async function findByEmail(email: string): Promise<User | null> {
		const user = await db.user.findUnique({
			where: { email },
			select: { id: true, name: true, email: true, role: true }
		});
		return user ? { ...user, role: user.role as UserRole } : null;
	}

	async function create(input: UserCreateInput): Promise<User> {
		const user = await db.user.create({
			data: {
				name: input.name,
				email: input.email,
				password: input.password,
				role: input.role
			},
			select: { id: true, name: true, email: true, role: true }
		});
		return { ...user, role: user.role as UserRole };
	}

	async function update(id: string, input: UserUpdateInput): Promise<User> {
		const data: Record<string, unknown> = {
			name: input.name,
			email: input.email,
			role: input.role
		};
		if (input.password) data.password = input.password;

		const user = await db.user.update({
			where: { id },
			data,
			select: { id: true, name: true, email: true, role: true }
		});
		return { ...user, role: user.role as UserRole };
	}

	async function remove(id: string): Promise<void> {
		await db.user.delete({ where: { id } });
	}

	return { findAll, findById, findByEmail, create, update, remove };
}
