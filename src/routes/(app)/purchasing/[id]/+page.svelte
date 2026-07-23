<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		ArrowLeft,
		FileText,
		Truck,
		Calendar,
		User,
		Building,
		AlertCircle,
		MessageSquare,
		Printer,
		Check,
		X
	} from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Button, DataTable, Modal, Textarea } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { PurchaseItem, ApprovalStatus, User as UserType } from '$lib/types';

	let { data } = $props();
	const purchase = $derived(data.purchase);
	const currentUser = $derived(data.user);

	let loading = $state(false);
	let rejectModalOpen = $state(false);
	let rejectLevel = $state<'departmentHead' | 'finance' | 'final' | null>(null);
	let rejectReason = $state('');
	let rejectError = $state('');

	const itemColumns = [
		{ key: 'product', header: 'Product', cell: (item: PurchaseItem) => item.product?.name ?? '-' },
		{
			key: 'qty',
			header: 'Quantity',
			cell: (item: PurchaseItem) => `${item.qty} ${item.product?.unit ?? ''}`
		},
		{ key: 'price', header: 'Price', cell: (item: PurchaseItem) => formatCurrency(item.price) },
		{
			key: 'subtotal',
			header: 'Subtotal',
			cell: (item: PurchaseItem) => formatCurrency(item.subtotal)
		},
		{
			key: 'notes',
			header: 'Notes',
			cell: (item: PurchaseItem) => item.notes || '-'
		}
	];

	const priorityVariant = $derived(
		purchase.priority === 'URGENT'
			? 'danger'
			: purchase.priority === 'HIGH'
				? 'warning'
				: purchase.priority === 'MEDIUM'
					? 'primary'
					: 'secondary'
	);

	const approvalLevels = $derived([
		{
			key: 'departmentHead' as const,
			label: 'Department Head',
			user: purchase.departmentHead,
			status: purchase.departmentHeadStatus,
			date: purchase.departmentHeadApprovedAt
		},
		{
			key: 'finance' as const,
			label: 'Finance Department',
			user: purchase.financeApprover,
			status: purchase.financeStatus,
			date: purchase.financeApprovedAt
		},
		{
			key: 'final' as const,
			label: 'Final Approval',
			user: purchase.finalApprover,
			status: purchase.finalStatus,
			date: purchase.finalApprovedAt
		}
	]);

	function approverName(user: { name: string; role: string } | null | undefined) {
		if (!user) return 'Not assigned';
		return `${user.name} (${user.role})`;
	}

	function approvalStatusVariant(status: ApprovalStatus) {
		if (status === 'APPROVED') return 'success';
		if (status === 'REJECTED') return 'danger';
		return 'warning';
	}

	function approvalStatusLabel(status: ApprovalStatus) {
		if (status === 'APPROVED') return 'Approved';
		if (status === 'REJECTED') return 'Rejected';
		return 'Pending';
	}

	function canActOnLevel(user: UserType | null | undefined, status: ApprovalStatus) {
		return status === 'PENDING' && user?.id === currentUser?.id;
	}

	async function handleApprove(level: 'departmentHead' | 'finance' | 'final') {
		loading = true;
		try {
			const res = await fetch(`/api/purchases/${purchase.id}/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ level })
			});

			if (res.ok) {
				toastStore.success('Purchase request approved successfully');
				await invalidateAll();
			} else {
				const errorData = await res.json().catch(() => ({}));
				toastStore.error(errorData.message || 'Failed to approve purchase request');
			}
		} finally {
			loading = false;
		}
	}

	function openRejectModal(level: 'departmentHead' | 'finance' | 'final') {
		rejectLevel = level;
		rejectReason = '';
		rejectError = '';
		rejectModalOpen = true;
	}

	function closeRejectModal() {
		rejectModalOpen = false;
		rejectLevel = null;
		rejectReason = '';
		rejectError = '';
	}

	async function handleReject() {
		if (!rejectLevel) return;
		loading = true;
		try {
			const res = await fetch(`/api/purchases/${purchase.id}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ level: rejectLevel, reason: rejectReason })
			});

			if (res.ok) {
				toastStore.success('Purchase request rejected');
				closeRejectModal();
				await invalidateAll();
			} else {
				const errorData = await res.json().catch(() => ({}));
				rejectError =
					errorData.errors?.reason?.[0] ||
					errorData.errors?.form?.[0] ||
					errorData.message ||
					'Failed to reject purchase request';
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Purchasing Request', href: '/purchasing' }, { label: purchase.prNumber }]}
	/>

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">{purchase.prNumber}</h1>
			<p class="text-muted">Purchasing request details</p>
		</div>
		<div class="flex gap-3">
			<Button variant="secondary" href="/purchasing">
				<ArrowLeft class="h-4 w-4" />
				Back
			</Button>
			<Button variant="secondary" href="/purchasing/{purchase.id}/print">
				<Printer class="h-4 w-4" />
				Print
			</Button>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card class="lg:col-span-2" padding="lg">
			<div class="mb-6 flex items-start justify-between">
				<div class="flex items-center gap-4">
					<div
						class="rounded-2xl bg-primary-100 p-4 text-primary-700 dark:bg-primary-300/30 dark:text-primary-300"
					>
						<FileText class="h-8 w-8" />
					</div>
					<div>
						<h2 class="text-main text-xl font-semibold">{purchase.prNumber}</h2>
						<p class="text-muted text-sm">{formatDate(purchase.dateOfRequest)}</p>
					</div>
				</div>
				<Badge variant={priorityVariant}>
					{purchase.priority}
				</Badge>
			</div>

			<div class="mb-6 grid gap-4 sm:grid-cols-2">
				<div class="bg-card-secondary flex items-center gap-3 rounded-lg p-4">
					<div
						class="text-accent-700 dark:bg-accent-900/30 rounded-lg bg-accent-100 p-2 dark:text-accent-300"
					>
						<Truck class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Supplier</p>
						<p class="text-main font-semibold">{purchase.supplier?.name ?? 'Not specified'}</p>
					</div>
				</div>
				<div class="bg-card-secondary flex items-center gap-3 rounded-lg p-4">
					<div
						class="text-warning-700 dark:bg-warning-900/30 rounded-lg bg-warning-100 p-2 dark:text-warning-500"
					>
						<Calendar class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Date Required</p>
						<p class="text-main font-semibold">{formatDate(purchase.dateRequired)}</p>
					</div>
				</div>
				<div class="bg-card-secondary flex items-center gap-3 rounded-lg p-4">
					<div
						class="text-success-700 dark:bg-success-900/30 rounded-lg bg-success-100 p-2 dark:text-success-600"
					>
						<Building class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Department</p>
						<p class="text-main font-semibold">{purchase.department}</p>
					</div>
				</div>
				<div class="bg-card-secondary flex items-center gap-3 rounded-lg p-4">
					<div
						class="rounded-lg bg-red-100 p-2 text-primary-700 dark:bg-primary-300/30 dark:text-primary-300"
					>
						<User class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Requested By</p>
						<p class="text-main font-semibold">{purchase.requester?.name ?? '-'}</p>
					</div>
				</div>
			</div>

			{#if purchase.purpose}
				<div class="bg-card-secondary mb-6 flex items-start gap-3 rounded-lg p-4">
					<div
						class="rounded-lg bg-slate-200 p-2 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
					>
						<AlertCircle class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Purpose / Reason for Request</p>
						<p class="text-main font-medium">{purchase.purpose}</p>
					</div>
				</div>
			{/if}

			{#if purchase.comments}
				<div class="bg-card-secondary mb-6 flex items-start gap-3 rounded-lg p-4">
					<div
						class="rounded-lg bg-slate-200 p-2 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
					>
						<MessageSquare class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Comments or Special Instructions</p>
						<p class="text-main font-medium">{purchase.comments}</p>
					</div>
				</div>
			{/if}

			<h3 class="text-main mb-4 text-lg font-semibold">Items</h3>
			<DataTable columns={itemColumns} rows={purchase.items ?? []} />

			<div class="border-theme mt-6 flex justify-end border-t pt-4">
				<div class="text-right">
					<p class="text-muted text-sm">Total Amount</p>
					<p class="text-2xl font-bold text-primary-600">{formatCurrency(purchase.total)}</p>
				</div>
			</div>
		</Card>

		<div class="space-y-6">
			<Card padding="lg">
				<h3 class="text-main mb-4 text-lg font-semibold">Request Summary</h3>
				<div class="space-y-4 text-sm">
					<div class="flex justify-between">
						<span class="text-muted">PR Number</span>
						<span class="text-main font-medium">{purchase.prNumber}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted">Supplier</span>
						<span class="text-main font-medium">{purchase.supplier?.name ?? 'Not specified'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted">Priority</span>
						<Badge variant={priorityVariant}>
							{purchase.priority}
						</Badge>
					</div>
					<div class="flex justify-between">
						<span class="text-muted">Date of Request</span>
						<span class="text-main font-medium">{formatDate(purchase.dateOfRequest)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted">Date Required</span>
						<span class="text-main font-medium">{formatDate(purchase.dateRequired)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted">Department</span>
						<span class="text-main font-medium">{purchase.department}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted">Items</span>
						<span class="text-main font-medium">{purchase.items?.length ?? 0}</span>
					</div>
					<div class="border-theme border-t pt-4">
						<div class="flex justify-between">
							<span class="text-muted">Total</span>
							<span class="text-lg font-bold text-primary-600"
								>{formatCurrency(purchase.total)}</span
							>
						</div>
					</div>
				</div>
			</Card>

			<Card padding="lg">
				<h3 class="text-main mb-4 text-lg font-semibold">Approval</h3>
				<div class="space-y-4 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted">Overall Status</span>
						<Badge variant={approvalStatusVariant(purchase.approvalStatus)}>
							{approvalStatusLabel(purchase.approvalStatus)}
						</Badge>
					</div>
					{#if purchase.approvalStatus === 'REJECTED' && purchase.rejectionReason}
						<div class="dark:bg-danger-900/20 rounded-lg bg-danger-50 p-3">
							<p class="text-danger-700 text-sm font-medium dark:text-slate-700">
								Rejection Reason
							</p>
							<p class="dark:text-danger-200 text-sm text-danger-600">{purchase.rejectionReason}</p>
						</div>
					{/if}
					<div class="border-theme border-t pt-4">
						<div class="flex justify-between">
							<span class="text-muted">Requested By</span>
							<span class="text-main font-medium">{purchase.requester?.name ?? '-'}</span>
						</div>
					</div>
					{#each approvalLevels as level (level.key)}
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="text-muted">{level.label}</p>
								<p class="text-main truncate font-medium">{approverName(level.user)}</p>
								{#if level.date}
									<p class="text-muted text-xs">{formatDate(level.date)}</p>
								{/if}
							</div>
							<div class="flex shrink-0 flex-col items-end gap-2">
								{#if level.user}
									<Badge variant={approvalStatusVariant(level.status)}>
										{approvalStatusLabel(level.status)}
									</Badge>
								{/if}
								{#if canActOnLevel(level.user, level.status)}
									<div class="flex gap-2">
										<Button size="sm" {loading} onclick={() => handleApprove(level.key)}>
											<Check class="h-3.5 w-3.5" />
											Approve
										</Button>
										<Button
											variant="danger"
											size="sm"
											{loading}
											onclick={() => openRejectModal(level.key)}
										>
											<X class="h-3.5 w-3.5" />
											Reject
										</Button>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</div>

<Modal open={rejectModalOpen} title="Reject Purchase Request" onclose={closeRejectModal}>
	<div class="space-y-4">
		<p class="text-muted text-sm">
			Please provide a reason for rejecting this purchase request. This reason will be visible to
			the requester.
		</p>
		<Textarea
			label="Rejection Reason"
			placeholder="Enter rejection reason..."
			bind:value={rejectReason}
			error={rejectError}
			required
			disabled={loading}
		/>
		<div class="flex justify-end gap-3">
			<Button variant="secondary" onclick={closeRejectModal} disabled={loading}>Cancel</Button>
			<Button variant="danger" {loading} onclick={handleReject}>
				<X class="h-4 w-4" />
				Reject
			</Button>
		</div>
	</div>
</Modal>
