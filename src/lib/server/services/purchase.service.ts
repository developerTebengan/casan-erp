import { purchaseRepository } from '$lib/server/repositories/purchase.repository';
import { userRepository } from '$lib/server/repositories/user.repository';
import { notificationService } from '$lib/server/services/notification.service';
import { validateRequired, type ValidationResult } from '$lib/utils/validation';
import type { PurchaseCreateInput } from '$lib/server/repositories/purchase.repository';
import type { PurchasePriority, ApprovalStatus, UserRole } from '$lib/types';

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

export function purchaseService() {
	const repo = purchaseRepository();

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
		requesterId: string
	): ValidationResult<PurchaseCreateInput> {
		const requiredErrors = validateRequired(input, [
			'prNumber',
			'dateOfRequest',
			'dateRequired',
			'decisionDeadline',
			'department',
			'purpose'
		]);
		const errors: Record<string, string[]> = { ...requiredErrors };

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
				prNumber: String(input.prNumber).trim(),
				supplierId: input.supplierId ? String(input.supplierId) : null,
				dateOfRequest: dateOfRequest!,
				priority: (priority as PurchasePriority) || 'MEDIUM',
				requesterId,
				dateRequired: dateRequired!,
				decisionDeadline: decisionDeadline!,
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

	async function list(filters: Parameters<typeof repo.findAll>[0]) {
		return repo.findAll(filters);
	}

	async function statusCounts() {
		return repo.countByApprovalStatus();
	}

	async function getById(id: string) {
		return repo.findById(id);
	}

	async function create(input: Record<string, unknown>, requesterId: string) {
		const validation = validate(input, requesterId);
		if (!validation.valid) return { success: false, errors: validation.errors };

		const existing = await repo.findByPrNumber(validation.data!.prNumber);
		if (existing) {
			return { success: false, errors: { prNumber: ['PR number already exists'] } };
		}

		const purchase = await repo.create(validation.data!);
		try {
			await notificationService().notifyPurchaseEvent('created', purchase);
		} catch (err) {
			console.error(err);
		}
		return { success: true, data: purchase };
	}

	async function remove(id: string) {
		const existing = await repo.findById(id);
		if (!existing) return { success: false, errors: { form: ['Purchasing request not found'] } };
		await repo.remove(id);
		return { success: true };
	}

	async function approve(id: string, level: ApprovalLevel, userId: string, userRole?: UserRole) {
		const purchase = await repo.findById(id);
		if (!purchase) return { success: false, errors: { form: ['Purchasing request not found'] } };
		if (purchase.approvalStatus === 'APPROVED' || purchase.approvalStatus === 'REJECTED') {
			return { success: false, errors: { form: ['Purchasing request is already finalized'] } };
		}

		const config = LEVEL_CONFIG[level];
		const approverId = purchase[`${config.idField}` as keyof typeof purchase] as
			string | null | undefined;
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
				string | null | undefined;
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
		try {
			await notificationService().notifyPurchaseEvent('approved', updated);
		} catch (err) {
			console.error(err);
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
			string | null | undefined;
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
			rejectionReason: isAdmin ? `[Admin override] ${String(reason).trim()}` : String(reason).trim()
		};

		const updated = await repo.update(id, data);
		try {
			await notificationService().notifyPurchaseEvent('rejected', updated);
		} catch (err) {
			console.error(err);
		}
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

		return { success: true, data: updated };
	}

	return { list, statusCounts, getById, create, remove, validate, approve, reject, reassign };
}
