import {
	targetsForPurchaseEvent,
	type PurchaseEvent,
	type PurchaseNotificationInput
} from '$lib/server/notifications/targets';
import { notificationRepository } from '$lib/server/repositories/notification.repository';

export function notificationService() {
	const repo = notificationRepository();

	async function notifyPurchaseEvent(event: PurchaseEvent, purchase: PurchaseNotificationInput) {
		await repo.createMany(targetsForPurchaseEvent(event, purchase));
	}

	async function listForUser(userId: string) {
		return repo.findLatestForUser(userId, 20);
	}

	async function countUnread(userId: string) {
		return repo.countUnread(userId);
	}

	async function markRead(id: string, userId: string) {
		return repo.markRead(id, userId);
	}

	return { notifyPurchaseEvent, createMany: repo.createMany, listForUser, countUnread, markRead };
}
