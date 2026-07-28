import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user || !hasPermission(locals.user.role, 'inventory:write')) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) {
			return json({ message: 'file is required' }, { status: 400 });
		}

		if (!file.type.startsWith('image/')) {
			return json({ message: 'Only image files are allowed' }, { status: 400 });
		}

		if (file.size > 3 * 1024 * 1024) {
			return json({ message: 'Image must be under 3MB' }, { status: 400 });
		}

		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
		const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
		const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
		const dir = path.join(process.cwd(), 'static', 'uploads', 'products');
		await mkdir(dir, { recursive: true });
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(path.join(dir, filename), buffer);

		const url = `/uploads/products/${filename}`;
		return json({ url });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to upload image' });
	}
};
