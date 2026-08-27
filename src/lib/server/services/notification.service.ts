import { db } from '$lib/server/db';
import type { AppNotification } from '$lib/types';

export interface NotificationCreateInput {
	userId: string;
	type: string;
	title: string;
	body: string;
	href?: string | null;
}

export function notificationService() {
	async function create(input: NotificationCreateInput): Promise<AppNotification> {
		const row = await db.notification.create({
			data: {
				userId: input.userId,
				type: input.type,
				title: input.title,
				body: input.body,
				href: input.href ?? null
			}
		});
		return mapNotification(row);
	}

	async function createMany(inputs: NotificationCreateInput[]): Promise<number> {
		if (inputs.length === 0) return 0;
		const result = await db.notification.createMany({
			data: inputs.map((i) => ({
				userId: i.userId,
				type: i.type,
				title: i.title,
				body: i.body,
				href: i.href ?? null
			}))
		});
		return result.count;
	}

	async function listForUser(
		userId: string,
		opts: { unreadOnly?: boolean; limit?: number } = {}
	): Promise<AppNotification[]> {
		const { unreadOnly = false, limit = 50 } = opts;
		const rows = await db.notification.findMany({
			where: {
				userId,
				...(unreadOnly ? { readAt: null } : {})
			},
			orderBy: { createdAt: 'desc' },
			take: Math.min(100, Math.max(1, limit))
		});
		return rows.map(mapNotification);
	}

	async function markRead(id: string, userId: string): Promise<AppNotification | null> {
		const existing = await db.notification.findFirst({ where: { id, userId } });
		if (!existing) return null;
		if (existing.readAt) return mapNotification(existing);
		const row = await db.notification.update({
			where: { id },
			data: { readAt: new Date() }
		});
		return mapNotification(row);
	}

	async function markAllRead(userId: string): Promise<number> {
		const result = await db.notification.updateMany({
			where: { userId, readAt: null },
			data: { readAt: new Date() }
		});
		return result.count;
	}

	async function counts(userId: string): Promise<{ unread: number; total: number }> {
		const [unread, total] = await Promise.all([
			db.notification.count({ where: { userId, readAt: null } }),
			db.notification.count({ where: { userId } })
		]);
		return { unread, total };
	}

	async function findUnreadByTypeHref(
		userId: string,
		type: string,
		href: string
	): Promise<AppNotification | null> {
		const row = await db.notification.findFirst({
			where: { userId, type, href, readAt: null },
			orderBy: { createdAt: 'desc' }
		});
		return row ? mapNotification(row) : null;
	}

	/**
	 * Lazy overdue-deadline notifications for the current user as a pending approver.
	 */
	async function ensureOverdueDeadlineNotifications(userId: string): Promise<number> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const overdue = await db.purchase.findMany({
			where: {
				deletedAt: null,
				approvalStatus: 'PENDING',
				decisionDeadline: { lt: today },
				OR: [
					{ departmentHeadId: userId, departmentHeadStatus: 'PENDING' },
					{ financeApproverId: userId, financeStatus: 'PENDING' },
					{ finalApproverId: userId, finalStatus: 'PENDING' }
				]
			},
			select: {
				id: true,
				prNumber: true,
				decisionDeadline: true
			},
			take: 50
		});

		let created = 0;
		for (const p of overdue) {
			const href = `/purchasing/${p.id}`;
			const existing = await findUnreadByTypeHref(userId, 'PR_DEADLINE_OVERDUE', href);
			if (existing) continue;
			await create({
				userId,
				type: 'PR_DEADLINE_OVERDUE',
				title: `Decision overdue: ${p.prNumber}`,
				body: `Purchasing request ${p.prNumber} has passed its decision deadline and still needs your approval.`,
				href
			});
			created += 1;
		}
		return created;
	}

	return {
		create,
		createMany,
		listForUser,
		markRead,
		markAllRead,
		counts,
		findUnreadByTypeHref,
		ensureOverdueDeadlineNotifications
	};
}

function mapNotification(n: {
	id: string;
	userId: string;
	type: string;
	title: string;
	body: string;
	href: string | null;
	readAt: Date | null;
	createdAt: Date;
}): AppNotification {
	return {
		id: n.id,
		userId: n.userId,
		type: n.type,
		title: n.title,
		body: n.body,
		href: n.href,
		readAt: n.readAt ? n.readAt.toISOString() : null,
		createdAt: n.createdAt.toISOString()
	};
}
