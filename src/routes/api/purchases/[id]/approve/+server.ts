import { json, error } from '@sveltejs/kit';
import { purchaseService } from '$lib/server/services/purchase.service';
import type { RequestHandler } from './$types';

const APPROVAL_LEVELS = ['departmentHead', 'finance', 'final'] as const;
type ApprovalLevel = (typeof APPROVAL_LEVELS)[number];

function isApprovalLevel(value: unknown): value is ApprovalLevel {
	return typeof value === 'string' && APPROVAL_LEVELS.includes(value as ApprovalLevel);
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const level = body.level;

		if (!isApprovalLevel(level)) {
			return json({ message: 'Invalid approval level' }, { status: 400 });
		}

		const service = purchaseService();
		const result = await service.approve(params.id, level, userId);

		if (!result.success) {
			return json(
				{ message: 'Failed to approve purchasing request', errors: result.errors },
				{ status: 400 }
			);
		}

		return json(result.data);
	} catch (e) {
		if (e instanceof Error && 'status' in e) throw e;
		console.error(e);
		throw error(500, { message: 'Failed to approve purchasing request' });
	}
};
