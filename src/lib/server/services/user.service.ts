import { userRepository } from '$lib/server/repositories/user.repository';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import { hashPassword } from '$lib/server/auth';
import type { UserCreateInput, UserUpdateInput } from '$lib/server/repositories/user.repository';
import type { UserRole } from '$lib/types';

const validRoles: UserRole[] = [
	'ADMIN',
	'USER',
	'BUYER',
	'STOCK_KEEPER',
	'DEPARTMENT_HEAD',
	'FINANCE',
	'MANAGER',
	'DIRECTOR'
];

export function userService() {
	const repo = userRepository();

	function validate(input: Record<string, unknown>, requirePassword = true): ValidationResult<Omit<UserCreateInput, 'password'> & { password?: string }> {
		const requiredFields = requirePassword
			? ['name', 'email', 'password', 'role']
			: ['name', 'email', 'role'];
		const requiredErrors = validateRequired(input, requiredFields);
		const errors: Record<string, string[]> = { ...requiredErrors };

		const email = String(input.email || '').trim();
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = ['Invalid email address'];
		}

		const role = input.role as string;
		if (role && !validRoles.includes(role as UserRole)) {
			errors.role = ['Invalid role'];
		}

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		return {
			valid: true,
			data: {
				name: String(input.name).trim(),
				email,
				role: role as UserRole,
				password: input.password ? String(input.password) : undefined
			}
		};
	}

	async function list() {
		return repo.findAll();
	}

	async function getById(id: string) {
		return repo.findById(id);
	}

	async function create(input: Record<string, unknown>) {
		const validation = validate(input, true);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findByEmail(validation.data!.email);
		if (existing) {
			return { success: false, errors: { email: ['Email already exists'] } };
		}

		const password = await hashPassword(validation.data!.password!);
		const user = await repo.create({
			name: validation.data!.name,
			email: validation.data!.email,
			password,
			role: validation.data!.role
		});
		return { success: true, data: user };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const validation = validate(input, false);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findById(id);
		if (!existing) {
			return { success: false, errors: { form: ['User not found'] } };
		}

		if (validation.data!.email.toLowerCase() !== existing.email.toLowerCase()) {
			const duplicate = await repo.findByEmail(validation.data!.email);
			if (duplicate) {
				return { success: false, errors: { email: ['Email already exists'] } };
			}
		}

		const updateData: UserUpdateInput = {
			name: validation.data!.name,
			email: validation.data!.email,
			role: validation.data!.role
		};

		if (validation.data!.password) {
			updateData.password = await hashPassword(validation.data!.password);
		}

		const user = await repo.update(id, updateData);
		return { success: true, data: user };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['User not found'] } };
		await repo.remove(id);
		return { success: true };
	}

	return { list, getById, create, update, remove, validate };
}
