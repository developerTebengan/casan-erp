import { db } from '$lib/server/db';
import { purchaseRepository } from '$lib/server/repositories/purchase.repository';
import { userRepository } from '$lib/server/repositories/user.repository';
import { goodsReceiptService } from '$lib/server/services/goodsReceipt.service';
import { notificationService } from '$lib/server/services/notification.service';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type { PurchaseCreateInput } from '$lib/server/repositories/purchase.repository';
import type {
	PurchasePriority,
	ApprovalStatus,
	UserRole,
	FulfillmentStatus,
	Purchase
} from '$lib/types';

async function notifyApproversAssigned(purchase: Purchase) {
	const service = notificationService();
	const assignees = [
		purchase.departmentHeadId,
		purchase.financeApproverId,
		purchase.finalApproverId
	].filter((id): id is string => !!id);

	const unique = [...new Set(assignees)];
	await service.createMany(
		unique.map((userId) => ({
			userId,
			type: 'PR_ASSIGNED',
			title: `PR assigned: ${purchase.prNumber}`,
			body: `You have been assigned as an approver on purchasing request ${purchase.prNumber}.`,
			href: `/purchasing/${purchase.id}`
		}))
	);
}

async function notifyReadyToReceive(purchase: Purchase) {
	const service = notificationService();
	const targets = new Set<string>();
	if (purchase.requesterId) targets.add(purchase.requesterId);

	await service.createMany(
		[...targets].map((userId) => ({
			userId,
			type: 'PR_READY_TO_RECEIVE',
			title: `Ready to receive: ${purchase.prNumber}`,
			body: `Purchasing request ${purchase.prNumber} is fully approved and ready for goods receipt.`,
			href: `/purchasing/${purchase.id}`
		}))
	);
}

type ApprovalLevel = 'departmentHead' | 'finance' | 'final';

const LEVEL_CONFIG: Record<
	ApprovalLevel,
	{
		idField: keyof PurchaseCreateInput;
		statusField: 'departmentHeadStatus' | 'financeStatus' | 'finalStatus';
		validRoles: UserRole[];
	}
> = {
	departmentHead: {
		idField: 'departmentHeadId',
		statusField: 'departmentHeadStatus',
		validRoles: ['DEPARTMENT_HEAD']
	},
	finance: { idField: 'financeApproverId', statusField: 'financeStatus', validRoles: ['FINANCE'] },
	final: {
		idField: 'finalApproverId',
		statusField: 'finalStatus',
		validRoles: ['MANAGER', 'DIRECTOR']
	}
};

function computeApprovalStatus(
	departmentHeadId: string | null | undefined,
	departmentHeadStatus: ApprovalStatus,
	financeApproverId: string | null | undefined,
	financeStatus: ApprovalStatus,
	finalApproverId: string | null | undefined,
	finalStatus: ApprovalStatus
): ApprovalStatus {
	const levels: { assigned: boolean; status: ApprovalStatus }[] = [
		{ assigned: !!departmentHeadId, status: departmentHeadStatus },
		{ assigned: !!financeApproverId, status: financeStatus },
		{ assigned: !!finalApproverId, status: finalStatus }
	];

	if (levels.some((l) => l.assigned && l.status === 'REJECTED')) return 'REJECTED';

	const assignedLevels = levels.filter((l) => l.assigned);
	if (assignedLevels.length === 0) return 'PENDING';
	if (assignedLevels.every((l) => l.status === 'APPROVED')) return 'APPROVED';
	return 'PENDING';
}

function computeFulfillmentStatus(
	approvalStatus: ApprovalStatus,
	items: { productId: string; qty: number }[],
	receivedMap: Record<string, number>
): { fulfillmentStatus: FulfillmentStatus; orderedQty: number; receivedQty: number } {
	const orderedQty = items.reduce((sum, i) => sum + i.qty, 0);
	if (approvalStatus !== 'APPROVED') {
		return { fulfillmentStatus: 'N/A', orderedQty, receivedQty: 0 };
	}

	let receivedQty = 0;
	let anyReceived = false;
	let allComplete = items.length > 0;

	for (const item of items) {
		const received = Math.min(item.qty, receivedMap[item.productId] ?? 0);
		receivedQty += received;
		if (received > 0) anyReceived = true;
		if (received < item.qty) allComplete = false;
	}

	if (allComplete) return { fulfillmentStatus: 'COMPLETE', orderedQty, receivedQty };
	if (anyReceived) return { fulfillmentStatus: 'PARTIAL', orderedQty, receivedQty };
	return { fulfillmentStatus: 'OPEN', orderedQty, receivedQty };
}

export function purchaseService() {
	const repo = purchaseRepository();

	async function generatePrNumber(): Promise<string> {
		const now = new Date();
		const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
		const likePrefix = `PR-${yyyymm}-`;
		const latest = await db.purchase.findFirst({
			where: { prNumber: { startsWith: likePrefix }, deletedAt: null },
			orderBy: { prNumber: 'desc' },
			select: { prNumber: true }
		});
		let seq = 1;
		if (latest?.prNumber) {
			const parts = latest.prNumber.split('-');
			const last = Number(parts[parts.length - 1]);
			if (!Number.isNaN(last)) seq = last + 1;
		}
		return `${likePrefix}${String(seq).padStart(4, '0')}`;
	}

	function validateItems(
		items: unknown
	):
		| { valid: true; data: { productId: string; qty: number; price: number; notes?: string }[] }
		| { valid: false; errors: string } {
		if (!Array.isArray(items) || items.length === 0) {
			return { valid: false, errors: 'At least one item is required' };
		}
		const parsed: { productId: string; qty: number; price: number; notes?: string }[] = [];
		for (const item of items) {
			if (!item.productId || !item.qty || item.price === undefined || item.price === null) {
				return { valid: false, errors: 'Each item must have product, quantity, and price' };
			}
			const qty = Number(item.qty);
			const price = Number(item.price);
			if (Number.isNaN(qty) || qty <= 0)
				return { valid: false, errors: 'Quantity must be a positive number' };
			if (Number.isNaN(price) || price < 0)
				return { valid: false, errors: 'Price must be a non-negative number' };
			parsed.push({
				productId: String(item.productId),
				qty,
				price,
				notes: item.notes ? String(item.notes) : undefined
			});
		}
		return { valid: true, data: parsed };
	}

	function validate(
		input: Record<string, unknown>,
		requesterId: string,
		opts?: { requirePrNumber?: boolean }
	): ValidationResult<PurchaseCreateInput> {
		const requirePrNumber = opts?.requirePrNumber === true;
		const requiredFields = [
			'dateOfRequest',
			'dateRequired',
			'decisionDeadline',
			'department',
			'purpose'
		];
		if (requirePrNumber) requiredFields.unshift('prNumber');

		const requiredErrors = validateRequired(input, requiredFields);
		const errors: Record<string, string[]> = { ...requiredErrors };

		if (requirePrNumber && (!input.prNumber || !String(input.prNumber).trim())) {
			errors.prNumber = ['PR number is required'];
		}

		const priority = input.priority as string;
		const validPriorities: PurchasePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
		if (priority && !validPriorities.includes(priority as PurchasePriority)) {
			errors.priority = ['Invalid priority'];
		}

		const dateOfRequest = input.dateOfRequest ? new Date(String(input.dateOfRequest)) : null;
		if (dateOfRequest && Number.isNaN(dateOfRequest.getTime())) {
			errors.dateOfRequest = ['Invalid date of request'];
		}

		const dateRequired = input.dateRequired ? new Date(String(input.dateRequired)) : null;
		if (dateRequired && Number.isNaN(dateRequired.getTime())) {
			errors.dateRequired = ['Invalid date required'];
		}

		const decisionDeadline = input.decisionDeadline
			? new Date(String(input.decisionDeadline))
			: null;
		if (decisionDeadline && Number.isNaN(decisionDeadline.getTime())) {
			errors.decisionDeadline = ['Invalid decision deadline'];
		}
		if (decisionDeadline && dateOfRequest && decisionDeadline < dateOfRequest) {
			errors.decisionDeadline = ['Decision deadline must be on/after date of request'];
		}

		let expectedDeliveryDate: Date | null = null;
		if (input.expectedDeliveryDate) {
			expectedDeliveryDate = new Date(String(input.expectedDeliveryDate));
			if (Number.isNaN(expectedDeliveryDate.getTime())) {
				errors.expectedDeliveryDate = ['Invalid expected delivery date'];
			}
		}

		const validApprovalRoles: Record<string, UserRole[]> = {
			departmentHeadId: ['DEPARTMENT_HEAD'],
			financeApproverId: ['FINANCE'],
			finalApproverId: ['MANAGER', 'DIRECTOR']
		};

		for (const field of Object.keys(validApprovalRoles)) {
			const value = input[field];
			if (value && typeof value !== 'string') {
				errors[field] = ['Invalid approver'];
			}
		}

		const itemsValidation = validateItems(input.items);
		if (!itemsValidation.valid) {
			errors.items = [itemsValidation.errors];
		}

		if (Object.keys(errors).length > 0) {
			return { valid: false, errors };
		}

		if (!itemsValidation.valid) {
			return { valid: false, errors: { items: [itemsValidation.errors] } };
		}

		return {
			valid: true,
			data: {
				prNumber: input.prNumber ? String(input.prNumber).trim() : '',
				supplierId: input.supplierId ? String(input.supplierId) : null,
				dateOfRequest: dateOfRequest!,
				priority: (priority as PurchasePriority) || 'MEDIUM',
				requesterId,
				dateRequired: dateRequired!,
				decisionDeadline: decisionDeadline!,
				expectedDeliveryDate,
				department: String(input.department).trim(),
				purpose: String(input.purpose).trim(),
				comments: input.comments ? String(input.comments).trim() : null,
				departmentHeadId: input.departmentHeadId ? String(input.departmentHeadId) : null,
				financeApproverId: input.financeApproverId ? String(input.financeApproverId) : null,
				finalApproverId: input.finalApproverId ? String(input.finalApproverId) : null,
				items: itemsValidation.data
			}
		};
	}

	async function attachFulfillment(purchases: Purchase[]): Promise<Purchase[]> {
		const approvedIds = purchases
			.filter((p) => p.approvalStatus === 'APPROVED')
			.map((p) => p.id);

		const receivedByPurchase =
			approvedIds.length > 0
				? await goodsReceiptService().getReceivedByProductBatch(approvedIds)
				: {};

		return purchases.map((p) => {
			const items = (p.items ?? []).map((i) => ({ productId: i.productId, qty: i.qty }));
			const { fulfillmentStatus, orderedQty, receivedQty } = computeFulfillmentStatus(
				p.approvalStatus,
				items,
				receivedByPurchase[p.id] ?? {}
			);
			return { ...p, fulfillmentStatus, orderedQty, receivedQty };
		});
	}

	async function list(filters: Parameters<typeof repo.findAll>[0] & {
		fulfillmentStatus?: FulfillmentStatus;
	}) {
		const { fulfillmentStatus, ...rest } = filters;

		if (
			fulfillmentStatus &&
			fulfillmentStatus !== 'N/A' &&
			(!rest.approvalStatus || rest.approvalStatus === 'APPROVED')
		) {
			const all = await repo.findAll({
				...rest,
				approvalStatus: 'APPROVED',
				page: 1,
				limit: 10000
			});
			const withFulfillment = await attachFulfillment(all.data);
			const filtered = withFulfillment.filter((p) => p.fulfillmentStatus === fulfillmentStatus);
			const page = rest.page ?? 1;
			const limit = rest.limit ?? 10;
			const start = (page - 1) * limit;
			return {
				data: filtered.slice(start, start + limit),
				pagination: {
					page,
					limit,
					total: filtered.length,
					totalPages: Math.ceil(filtered.length / limit) || 1
				}
			};
		}

		const result = await repo.findAll(rest);
		return {
			...result,
			data: await attachFulfillment(result.data)
		};
	}

	async function statusCounts() {
		return repo.countByApprovalStatus();
	}

	async function fulfillmentCounts() {
		const all = await repo.findAll({
			approvalStatus: 'APPROVED',
			page: 1,
			limit: 10000
		});
		const withFulfillment = await attachFulfillment(all.data);
		const counts = { ALL: withFulfillment.length, OPEN: 0, PARTIAL: 0, COMPLETE: 0 };
		for (const p of withFulfillment) {
			if (p.fulfillmentStatus === 'OPEN') counts.OPEN++;
			else if (p.fulfillmentStatus === 'PARTIAL') counts.PARTIAL++;
			else if (p.fulfillmentStatus === 'COMPLETE') counts.COMPLETE++;
		}
		return counts;
	}

	async function getById(id: string) {
		const purchase = await repo.findById(id);
		if (!purchase) return null;
		const [withFulfillment] = await attachFulfillment([purchase]);
		return withFulfillment;
	}

	async function create(input: Record<string, unknown>, requesterId: string) {
		const validation = validate(input, requesterId, { requirePrNumber: false });
		if (!validation.valid) return { success: false, errors: validation.errors };

		let prNumber = validation.data!.prNumber;
		if (!prNumber) {
			prNumber = await generatePrNumber();
		}

		const existing = await repo.findByPrNumber(prNumber);
		if (existing) {
			if (!validation.data!.prNumber) {
				prNumber = await generatePrNumber();
			} else {
				return { success: false, errors: { prNumber: ['PR number already exists'] } };
			}
		}

		const purchase = await repo.create({
			...validation.data!,
			prNumber
		});
		await notifyApproversAssigned(purchase);
		return { success: true, data: purchase };
	}

	async function update(id: string, input: Record<string, unknown>) {
		const existing = await repo.findById(id);
		if (!existing) {
			return { success: false, errors: { form: ['Purchasing request not found'] } };
		}
		if (existing.approvalStatus === 'APPROVED') {
			return {
				success: false,
				errors: { form: ['Approved purchasing requests cannot be edited'] }
			};
		}
		if (existing.approvalStatus !== 'PENDING' && existing.approvalStatus !== 'REJECTED') {
			return {
				success: false,
				errors: { form: ['Only pending or rejected purchasing requests can be edited'] }
			};
		}

		const validation = validate(input, existing.requesterId, { requirePrNumber: true });
		if (!validation.valid) return { success: false, errors: validation.errors };

		const prNumber = validation.data!.prNumber;
		const duplicate = await repo.findByPrNumber(prNumber, id);
		if (duplicate) {
			return { success: false, errors: { prNumber: ['PR number already exists'] } };
		}

		const resetApproval = existing.approvalStatus === 'REJECTED';
		const purchase = await repo.replaceContents(id, {
			...validation.data!,
			requesterId: existing.requesterId,
			resetApproval
		});
		return { success: true, data: purchase };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Purchasing request not found'] } };
		await repo.remove(id);
		return { success: true };
	}

	async function approve(
		id: string,
		level: ApprovalLevel,
		userId: string,
		userRole?: UserRole
	) {
		const purchase = await repo.findById(id);
		if (!purchase) return { success: false, errors: { form: ['Purchasing request not found'] } };
		if (purchase.approvalStatus === 'APPROVED' || purchase.approvalStatus === 'REJECTED') {
			return { success: false, errors: { form: ['Purchasing request is already finalized'] } };
		}

		const config = LEVEL_CONFIG[level];
		const approverId = purchase[`${config.idField}` as keyof typeof purchase] as
			| string
			| null
			| undefined;
		const isAdmin = userRole === 'ADMIN';

		if (!approverId && !isAdmin) {
			return { success: false, errors: { form: [`No ${level} approver assigned`] } };
		}
		if (!isAdmin && approverId !== userId) {
			return { success: false, errors: { form: ['You are not authorized to approve this level'] } };
		}
		if (!approverId && isAdmin) {
			return {
				success: false,
				errors: { form: ['Assign an approver first, or reassign this level before approving'] }
			};
		}

		const currentStatus = purchase[
			`${config.statusField}` as keyof typeof purchase
		] as ApprovalStatus;
		if (currentStatus !== 'PENDING') {
			return { success: false, errors: { form: ['This approval level is already processed'] } };
		}

		// Sequential: earlier assigned levels must already be approved
		const order: ApprovalLevel[] = ['departmentHead', 'finance', 'final'];
		const currentIndex = order.indexOf(level);
		for (let i = 0; i < currentIndex; i++) {
			const prev = order[i];
			const prevConfig = LEVEL_CONFIG[prev];
			const prevAssignee = purchase[prevConfig.idField as keyof typeof purchase] as
				| string
				| null
				| undefined;
			if (!prevAssignee) continue;
			const prevStatus = purchase[prevConfig.statusField] as ApprovalStatus;
			if (prevStatus !== 'APPROVED') {
				return {
					success: false,
					errors: { form: [`Waiting for ${prev} approval before this level`] }
				};
			}
		}

		const approvedAtField = config.statusField.replace('Status', 'ApprovedAt');
		const data: Record<string, ApprovalStatus | Date> = {
			[config.statusField]: 'APPROVED',
			[approvedAtField]: new Date()
		};
		data.approvalStatus = computeApprovalStatus(
			purchase.departmentHeadId,
			(data.departmentHeadStatus as ApprovalStatus) ?? purchase.departmentHeadStatus,
			purchase.financeApproverId,
			(data.financeStatus as ApprovalStatus) ?? purchase.financeStatus,
			purchase.finalApproverId,
			(data.finalStatus as ApprovalStatus) ?? purchase.finalStatus
		);

		const updated = await repo.update(id, data);
		if (updated.approvalStatus === 'APPROVED') {
			await notifyReadyToReceive(updated);
		}
		return { success: true, data: updated };
	}

	async function reject(
		id: string,
		level: ApprovalLevel,
		reason: string,
		userId: string,
		userRole?: UserRole
	) {
		const purchase = await repo.findById(id);
		if (!purchase) return { success: false, errors: { form: ['Purchasing request not found'] } };
		if (purchase.approvalStatus === 'APPROVED' || purchase.approvalStatus === 'REJECTED') {
			return { success: false, errors: { form: ['Purchasing request is already finalized'] } };
		}

		const config = LEVEL_CONFIG[level];
		const approverId = purchase[`${config.idField}` as keyof typeof purchase] as
			| string
			| null
			| undefined;
		const isAdmin = userRole === 'ADMIN';

		if (!approverId && !isAdmin) {
			return { success: false, errors: { form: [`No ${level} approver assigned`] } };
		}
		if (!isAdmin && approverId !== userId) {
			return { success: false, errors: { form: ['You are not authorized to reject this level'] } };
		}

		const currentStatus = purchase[
			`${config.statusField}` as keyof typeof purchase
		] as ApprovalStatus;
		if (currentStatus !== 'PENDING') {
			return { success: false, errors: { form: ['This approval level is already processed'] } };
		}

		if (!reason || !String(reason).trim()) {
			return { success: false, errors: { reason: ['Rejection reason is required'] } };
		}

		const data: Record<string, ApprovalStatus | string | null> = {
			[config.statusField]: 'REJECTED',
			approvalStatus: 'REJECTED',
			rejectionReason: isAdmin
				? `[Admin override] ${String(reason).trim()}`
				: String(reason).trim()
		};

		const updated = await repo.update(id, data);
		return { success: true, data: updated };
	}

	async function reassign(
		id: string,
		level: ApprovalLevel,
		newApproverId: string,
		actorRole: UserRole
	) {
		if (actorRole !== 'ADMIN') {
			return { success: false, errors: { form: ['Only ADMIN can reassign approvers'] } };
		}

		const purchase = await repo.findById(id);
		if (!purchase) return { success: false, errors: { form: ['Purchasing request not found'] } };
		if (purchase.approvalStatus === 'APPROVED' || purchase.approvalStatus === 'REJECTED') {
			return { success: false, errors: { form: ['Purchasing request is already finalized'] } };
		}

		const config = LEVEL_CONFIG[level];
		const currentStatus = purchase[config.statusField] as ApprovalStatus;
		if (currentStatus !== 'PENDING') {
			return {
				success: false,
				errors: { form: ['Cannot reassign a level that is already processed'] }
			};
		}

		if (!newApproverId) {
			return { success: false, errors: { form: ['New approver is required'] } };
		}

		const user = await userRepository().findById(newApproverId);
		if (!user) {
			return { success: false, errors: { form: ['User not found'] } };
		}
		if (!config.validRoles.includes(user.role)) {
			return {
				success: false,
				errors: {
					form: [`User must have role: ${config.validRoles.join(' or ')}`]
				}
			};
		}

		const updated = await repo.update(id, {
			[config.idField]: newApproverId
		} as Parameters<typeof repo.update>[1]);

		await notificationService().create({
			userId: newApproverId,
			type: 'PR_ASSIGNED',
			title: `PR assigned: ${updated.prNumber}`,
			body: `You have been assigned as an approver on purchasing request ${updated.prNumber}.`,
			href: `/purchasing/${updated.id}`
		});

		return { success: true, data: updated };
	}

	return {
		list,
		statusCounts,
		fulfillmentCounts,
		getById,
		create,
		update,
		remove,
		validate,
		approve,
		reject,
		reassign,
		generatePrNumber
	};
}
