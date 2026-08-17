import { db } from '$lib/server/db';
import type {
	NotificationType,
	PurchaseNotificationTarget
} from '$lib/server/notifications/targets';

export interface NotificationRecord {
	id: string;
	userId: string;
	type: NotificationType;
	titleKey: string;
	bodyKey: string;
	params: Record<string, string>;
	href: string;
	readAt: string | null;
	createdAt: string;
}

function mapParams(params: unknown): Record<string, string> {
	if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
		if (value == null) continue;
		out[key] = String(value);
	}
	return out;
}

function mapNotification(row: {
	id: string;
	userId: string;
	type: NotificationType;
	titleKey: string;
	bodyKey: string;
	params: unknown;
	href: string;
	readAt: Date | null;
	createdAt: Date;
}): NotificationRecord {
	return {
		id: row.id,
		userId: row.userId,
		type: row.type,
		titleKey: row.titleKey,
		bodyKey: row.bodyKey,
		params: mapParams(row.params),
		href: row.href,
		readAt: row.readAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString()
	};
}

export function notificationRepository() {
	async function createMany(targets: PurchaseNotificationTarget[]): Promise<void> {
		if (targets.length === 0) return;
		await db.notification.createMany({
			data: targets.map((target) => ({
				userId: target.userId,
				type: target.type,
				titleKey: target.titleKey,
				bodyKey: target.bodyKey,
				params: target.params,
				href: target.href
			}))
		});
	}

	async function findLatestForUser(userId: string, limit = 20): Promise<NotificationRecord[]> {
		const rows = await db.notification.findMany({
			where: { userId },
			orderBy: [{ readAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
			take: limit
		});
		return rows.map(mapNotification);
	}

	async function countUnread(userId: string): Promise<number> {
		return db.notification.count({ where: { userId, readAt: null } });
	}

	async function markRead(id: string, userId: string): Promise<NotificationRecord | null> {
		const existing = await db.notification.findFirst({ where: { id, userId } });
		if (!existing) return null;
		if (existing.readAt) return mapNotification(existing);
		const updated = await db.notification.update({
			where: { id },
			data: { readAt: new Date() }
		});
		return mapNotification(updated);
	}

	return { createMany, findLatestForUser, countUnread, markRead };
}
