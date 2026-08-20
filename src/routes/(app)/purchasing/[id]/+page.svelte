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
		X,
		PackagePlus
	} from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Button, DataTable, Modal, Textarea, Input, Select } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, formatNumber, parseIdNumber } from '$lib/utils/format';
	import { supplierNames } from '$lib/purchasing/catalog';
	import type { PurchaseItem, ApprovalStatus, User as UserType, UserRole } from '$lib/types';

	let { data } = $props();
	const purchase = $derived(data.purchase);
	const currentUser = $derived(data.user);
	const canReceive = $derived(data.canReceive);
	const isAdmin = $derived(data.isAdmin);
	const users = $derived(data.users);
	let receipt = $state(data.receipt);
	let receiveQtys = $state<Record<string, number>>({});
	let receivePrices = $state<Record<string, string>>({});
	let receiveNote = $state('');
	let receiving = $state(false);
	let receivingItemId = $state<string | null>(null);
	let reassignLevel = $state<'departmentHead' | 'finance' | 'final' | null>(null);
	let reassignUserId = $state('');
	let reassigning = $state(false);

	$effect(() => {
		receipt = data.receipt;
		const next: Record<string, number> = {};
		const prices: Record<string, string> = {};
		for (const line of data.receipt?.lines ?? []) {
			next[line.itemId] = line.remainingQty;
			prices[line.itemId] = formatNumber(line.orderedPrice ?? 0);
		}
		receiveQtys = next;
		receivePrices = prices;
	});

	let loading = $state(false);
	let rejectModalOpen = $state(false);
	let rejectLevel = $state<'departmentHead' | 'finance' | 'final' | null>(null);
	let rejectReason = $state('');
	let rejectError = $state('');

	const itemColumns = $derived([
		{ key: 'product', header: 'Product', cell: (item: PurchaseItem) => item.product?.name ?? '-' },
		{
			key: 'type',
			header: 'Type',
			cell: (item: PurchaseItem) => item.product?.category?.name ?? '-'
		},
		{
			key: 'supplier',
			header: 'Supplier',
			cell: (item: PurchaseItem) => item.supplier?.name ?? purchase.supplier?.name ?? '-'
		},
		{
			key: 'qty',
			header: 'Quantity',
			cell: (item: PurchaseItem) => `${item.qty} ${item.product?.unit ?? ''}`
		},
		{
			key: 'status',
			header: 'Receive status',
			cell: (item: PurchaseItem) => {
				const line = receipt?.lines?.find((l: { itemId: string }) => l.itemId === item.id);
				return receiveStatusBadge(line?.status ?? 'WAITING');
			}
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
	]);

	function receiveStatusBadge(status: string) {
		if (status === 'STOCK_IN') {
			return '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600">Stock in</span>';
		}
		if (status === 'PARTIAL') {
			return '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">Partial</span>';
		}
		return '<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600">Waiting</span>';
	}

	function receiveStatusLabel(status: string) {
		if (status === 'STOCK_IN') return 'Stock in';
		if (status === 'PARTIAL') return 'Partial';
		return 'Waiting';
	}

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

	function isDecisionOverdue(p: typeof purchase) {
		if (p.approvalStatus !== 'PENDING') return false;
		const due = new Date(p.decisionDeadline || p.dateRequired);
		const today = new Date();
		due.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		return due < today;
	}

	function canActOnLevel(user: UserType | null | undefined, status: ApprovalStatus) {
		if (status !== 'PENDING') return false;
		if (isAdmin && user) return true;
		return user?.id === currentUser?.id;
	}

	function isWaitingOnPrevious(levelKey: 'departmentHead' | 'finance' | 'final') {
		const order = ['departmentHead', 'finance', 'final'] as const;
		const idx = order.indexOf(levelKey);
		for (let i = 0; i < idx; i++) {
			const prev = approvalLevels[i];
			if (prev.user && prev.status !== 'APPROVED') return true;
		}
		return false;
	}

	const nextPending = $derived(approvalLevels.find((l) => l.user && l.status === 'PENDING'));

	function reassignOptions(levelKey: 'departmentHead' | 'finance' | 'final') {
		const roleMap: Record<typeof levelKey, UserRole[]> = {
			departmentHead: ['DEPARTMENT_HEAD'],
			finance: ['FINANCE'],
			final: ['MANAGER', 'DIRECTOR']
		};
		return [
			{ value: '', label: 'Select user' },
			...users
				.filter((u) => roleMap[levelKey].includes(u.role))
				.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))
		];
	}

	async function handleReassign() {
		if (!reassignLevel || !reassignUserId) return;
		reassigning = true;
		try {
			const res = await fetch(`/api/purchases/${purchase.id}/reassign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ level: reassignLevel, approverId: reassignUserId })
			});
			if (res.ok) {
				toastStore.success('Approver reassigned');
				reassignLevel = null;
				reassignUserId = '';
				await invalidateAll();
			} else {
				const err = await res.json().catch(() => ({}));
				toastStore.error(err.errors?.form?.[0] || err.message || 'Failed to reassign');
			}
		} finally {
			reassigning = false;
		}
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

	async function handleReceive(itemId: string) {
		if (!receipt) return;
		const line = receipt.lines.find((row: { itemId: string; remainingQty: number }) => row.itemId === itemId);
		if (!line || line.remainingQty <= 0) return;
		const qty = Math.min(Number(receiveQtys[itemId] ?? 0), line.remainingQty);
		if (qty <= 0) {
			toastStore.error('Enter the invoiced qty that arrived for this item');
			return;
		}

		receiving = true;
		receivingItemId = itemId;
		try {
			const res = await fetch(`/api/purchases/${purchase.id}/receive`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [
						{
							itemId: line.itemId,
							productId: line.productId,
							qty,
							unitPrice: parseIdNumber(receivePrices[itemId] ?? line.orderedPrice ?? 0)
						}
					],
					note: receiveNote
				})
			});

			if (res.ok) {
				toastStore.success('Item received into stock');
				receiveNote = '';
				await invalidateAll();
			} else {
				const errorData = await res.json().catch(() => ({}));
				toastStore.error(
					errorData.errors?.form?.[0] || errorData.message || 'Failed to receive goods'
				);
			}
		} finally {
			receiving = false;
			receivingItemId = null;
		}
	}

	const leftover = $derived(data.leftover);
	let actualTax = $state('');
	let actualShipping = $state('');
	let actualOther = $state('');
	let leftoverDest = $state('KAS_KECIL');
	let leftoverLoading = $state('');

	$effect(() => {
		const snap = data.leftover;
		if (!snap) return;
		actualTax = formatNumber(snap.actualTax ?? snap.tax ?? 0);
		actualShipping = formatNumber(snap.actualShipping ?? snap.shipping ?? 0);
		actualOther = formatNumber(snap.actualOtherFees ?? snap.otherFees ?? 0);
	});

	async function saveLeftover(submitRequest: boolean) {
		leftoverLoading = submitRequest ? 'req' : 'save';
		try {
			const res = await fetch(`/api/purchases/${purchase.id}/settlement`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actualTax: parseIdNumber(actualTax),
					actualShipping: parseIdNumber(actualShipping),
					actualOtherFees: parseIdNumber(actualOther),
					destination: leftoverDest,
					submitRequest
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toastStore.error(body.errors?.form?.[0] || body.message || 'Failed');
				return;
			}
			toastStore.success(submitRequest ? 'Refund request submitted' : 'Actual fees saved');
			await invalidateAll();
		} finally {
			leftoverLoading = '';
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
						<p class="text-main font-semibold">{supplierNames(purchase)}</p>
					</div>
				</div>
				<div class="bg-card-secondary flex items-center gap-3 rounded-lg p-4">
					<div
						class="text-warning-700 dark:bg-warning-900/30 rounded-lg bg-warning-100 p-2 dark:text-warning-500"
					>
						<Calendar class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Date Required (goods)</p>
						<p class="text-main font-semibold">{formatDate(purchase.dateRequired)}</p>
					</div>
				</div>
				<div class="bg-card-secondary flex items-center gap-3 rounded-lg p-4">
					<div
						class="rounded-lg bg-danger-100 p-2 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
					>
						<Calendar class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Decision deadline</p>
						<p class="text-main font-semibold">
							{formatDate(purchase.decisionDeadline || purchase.dateRequired)}
						</p>
						{#if purchase.approvalStatus === 'PENDING' && isDecisionOverdue(purchase)}
							<p class="text-danger-600 text-xs font-medium">Overdue — decide ASAP</p>
						{/if}
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
					<p class="text-muted text-sm">Line + tax / shipping / other</p>
					<p class="text-2xl font-bold text-primary-600">{formatCurrency(purchase.total)}</p>
					<p class="text-muted mt-1 text-xs">
						Tax {formatCurrency(purchase.tax ?? 0)} · Shipping {formatCurrency(purchase.shipping ?? 0)}
						· Other {formatCurrency(purchase.otherFees ?? 0)}
					</p>
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
						<span class="text-main font-medium">{supplierNames(purchase)}</span>
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
						<span class="text-muted">Decision by</span>
						<span
							class="font-medium {isDecisionOverdue(purchase)
								? 'text-danger-600'
								: 'text-main'}"
						>
							{formatDate(purchase.decisionDeadline || purchase.dateRequired)}
						</span>
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

				{#if purchase.approvalStatus === 'PENDING' && nextPending}
					<div
						class="mb-4 rounded-lg bg-primary-50 p-3 text-sm text-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
					>
						<p class="font-medium">Waiting on: {nextPending.label}</p>
						<p class="mt-1">
							Assigned to
							<strong>{nextPending.user?.name ?? '—'}</strong>
							{#if nextPending.user?.email}
								({nextPending.user.email})
							{/if}
						</p>
						{#if nextPending.user && nextPending.user.id !== currentUser.id && !isAdmin}
							<p class="mt-2 text-xs opacity-90">
								Log in as that user (or ask Admin to approve/reassign). Demo password:
								<code class="rounded bg-white/50 px-1 dark:bg-black/20">password</code>
							</p>
						{/if}
						{#if isAdmin}
							<p class="mt-2 text-xs opacity-90">
								You are ADMIN — you can approve/reject any pending level or reassign the
								approver below.
							</p>
						{/if}
					</div>
				{/if}

				<div class="space-y-4 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted">Overall Status</span>
						<Badge variant={approvalStatusVariant(purchase.approvalStatus)}>
							{approvalStatusLabel(purchase.approvalStatus)}
						</Badge>
					</div>
					{#if purchase.approvalStatus === 'REJECTED' && purchase.rejectionReason}
						<div class="dark:bg-danger-900/20 rounded-lg bg-danger-50 p-3">
							<p class="text-sm font-medium text-danger-700 dark:text-danger-300">
								Rejection Reason
							</p>
							<p class="text-sm text-danger-600 dark:text-danger-200">{purchase.rejectionReason}</p>
						</div>
					{/if}
					<div class="border-theme border-t pt-4">
						<div class="flex justify-between">
							<span class="text-muted">Requested By</span>
							<span class="text-main font-medium">{purchase.requester?.name ?? '-'}</span>
						</div>
					</div>
					{#each approvalLevels as level (level.key)}
						<div class="border-theme space-y-2 border-b pb-4 last:border-0 last:pb-0">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="text-muted">{level.label}</p>
									<p class="text-main truncate font-medium">{approverName(level.user)}</p>
									{#if level.user?.email}
										<p class="text-muted truncate text-xs">{level.user.email}</p>
									{/if}
									{#if level.date}
										<p class="text-muted text-xs">{formatDate(level.date)}</p>
									{/if}
									{#if isWaitingOnPrevious(level.key) && level.status === 'PENDING'}
										<p class="text-warning-700 dark:text-warning-400 mt-1 text-xs">
											Waiting for previous level to approve first
										</p>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end gap-2">
									{#if level.user}
										<Badge variant={approvalStatusVariant(level.status)}>
											{approvalStatusLabel(level.status)}
										</Badge>
									{/if}
									{#if canActOnLevel(level.user, level.status) && !isWaitingOnPrevious(level.key)}
										<div class="flex gap-2">
											<Button size="sm" {loading} onclick={() => handleApprove(level.key)}>
												<Check class="h-3.5 w-3.5" />
												{isAdmin && level.user?.id !== currentUser.id ? 'Admin approve' : 'Approve'}
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
									{#if isAdmin && level.status === 'PENDING'}
										<Button
											size="sm"
											variant="secondary"
											onclick={() => {
												reassignLevel = level.key;
												reassignUserId = level.user?.id ?? '';
											}}
										>
											Reassign
										</Button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</Card>

			{#if canReceive && purchase.approvalStatus === 'APPROVED' && receipt}
				<Card padding="lg">
					<div class="mb-4 flex items-center gap-3">
						<div
							class="rounded-lg bg-success-100 p-2 text-success-700 dark:bg-success-900/30 dark:text-success-500"
						>
							<PackagePlus class="h-5 w-5" />
						</div>
						<div>
							<h3 class="text-main text-lg font-semibold">Goods Receipt</h3>
							<p class="text-muted text-sm">
								{#if receipt.fullyReceived}
									All items received into stock
								{:else if receipt.partiallyReceived}
									Some items are in. Receive the rest when they arrive.
								{:else}
									Qty defaults to the invoiced amount. Receive each item when it arrives.
								{/if}
							</p>
						</div>
					</div>

					<div class="space-y-4">
						{#each receipt.groups ?? [{ category: 'Items', lines: receipt.lines, status: receipt.fullyReceived ? 'STOCK_IN' : receipt.partiallyReceived ? 'PARTIAL' : 'WAITING' }] as group}
							<div class="border-theme rounded-lg border p-3">
								<div class="mb-3 flex items-center justify-between gap-2">
									<p class="text-main text-sm font-semibold">{group.category}</p>
									<Badge
										variant={group.status === 'STOCK_IN'
											? 'success'
											: group.status === 'PARTIAL'
												? 'primary'
												: 'warning'}
									>
										{receiveStatusLabel(group.status)}
									</Badge>
								</div>
								<div class="space-y-3">
									{#each group.lines as line}
										<div class="rounded-md bg-slate-50 p-3 dark:bg-slate-800/40">
											<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
												<div>
													<p class="text-main text-sm font-medium">
														{line.productCode} — {line.productName}
													</p>
													<p class="text-muted text-xs">
														{#if line.supplierName}
															{line.supplierName} ·
														{/if}
														Ordered {line.orderedQty}
														{line.unit} · Received {line.receivedQty} · Remaining {line.remainingQty}
														{#if line.lastInAt}
															· Last in {formatDate(line.lastInAt)}
														{/if}
													</p>
												</div>
												<Badge
													variant={line.status === 'STOCK_IN'
														? 'success'
														: line.status === 'PARTIAL'
															? 'primary'
															: 'warning'}
												>
													{receiveStatusLabel(line.status)}
												</Badge>
											</div>
											{#if canReceive && line.remainingQty > 0}
												<div class="space-y-2">
													<Input
														label="Receive qty"
														type="number"
														min="1"
														max={line.remainingQty}
														value={String(receiveQtys[line.itemId] ?? line.remainingQty)}
														oninput={(e) => {
															const v = Number((e.target as HTMLInputElement).value);
															receiveQtys = {
																...receiveQtys,
																[line.itemId]: Number.isNaN(v) ? 0 : v
															};
														}}
													/>
													<Input
														label="Unit price"
														type="text"
														value={receivePrices[line.itemId] ?? formatNumber(line.orderedPrice ?? 0)}
														oninput={(e) => {
															receivePrices = {
																...receivePrices,
																[line.itemId]: (e.target as HTMLInputElement).value
															};
														}}
														onblur={() => {
															receivePrices = {
																...receivePrices,
																[line.itemId]: formatNumber(
																	parseIdNumber(
																		receivePrices[line.itemId] ?? line.orderedPrice ?? 0
																	)
																)
															};
														}}
													/>
													<p class="text-muted text-xs">
														Defaults to invoiced qty still due ({line.remainingQty}
														{line.unit}). Change qty or price if this delivery differs.
													</p>
													<div class="flex flex-wrap gap-2">
														<Button
															size="sm"
															variant="secondary"
															onclick={() => {
																receiveQtys = {
																	...receiveQtys,
																	[line.itemId]: line.remainingQty
																};
															}}
														>
															Use invoiced qty
														</Button>
														<Button
															size="sm"
															variant="primary"
															loading={receiving && receivingItemId === line.itemId}
															disabled={receiving}
															onclick={() => handleReceive(line.itemId)}
														>
															<PackagePlus class="h-3.5 w-3.5" />
															Receive this item
														</Button>
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>

					{#if canReceive && receipt.canReceive}
						<div class="mt-4 space-y-3">
							<Textarea
								label="Note (optional)"
								placeholder="Delivery note / invoice ref..."
								bind:value={receiveNote}
							/>
						</div>
					{/if}
				</Card>
			{/if}

			{#if purchase.approvalStatus === 'APPROVED' && leftover}
				<Card padding="lg">
					<h3 class="text-main mb-2 text-lg font-semibold">Leftover vs approved total</h3>
					<p class="text-muted mb-4 text-sm">
						Approved {formatCurrency(leftover.approvedGrand)} − goods received
						{formatCurrency(leftover.actualGoods)} − extras {formatCurrency(leftover.actualExtras)}
						= leftover {formatCurrency(leftover.leftover)}
					</p>
					{#if receipt && !receipt.fullyReceived}
						<p class="text-warning-700 mb-4 text-sm dark:text-warning-500">
							Lines still waiting. You can file leftover anyway if the bill is already known.
						</p>
					{/if}
					{#if canReceive}
						<div class="grid gap-4 sm:grid-cols-3">
							<Input
								label="Actual tax"
								type="text"
								bind:value={actualTax}
								onblur={() => (actualTax = formatNumber(parseIdNumber(actualTax)))}
							/>
							<Input
								label="Actual shipping"
								type="text"
								bind:value={actualShipping}
								onblur={() => (actualShipping = formatNumber(parseIdNumber(actualShipping)))}
							/>
							<Input
								label="Actual other"
								type="text"
								bind:value={actualOther}
								onblur={() => (actualOther = formatNumber(parseIdNumber(actualOther)))}
							/>
						</div>
						<div class="mt-4 flex flex-wrap items-end gap-3">
							{#if leftover.leftover > 0 && !leftover.hasActive}
								<Select
									label="Return leftover to"
									options={[
										{ value: 'KAS_KECIL', label: 'Kas kecil' },
										{ value: 'BANK', label: 'Rekening kantor' }
									]}
									bind:value={leftoverDest}
								/>
							{/if}
							<Button
								variant="secondary"
								loading={leftoverLoading === 'save'}
								onclick={() => saveLeftover(false)}
							>
								Save actual fees
							</Button>
							{#if leftover.leftover > 0 && !leftover.hasActive}
								<Button
									variant="primary"
									loading={leftoverLoading === 'req'}
									onclick={() => saveLeftover(true)}
								>
									Submit leftover
								</Button>
							{/if}
							{#if leftover.hasActive}
								<p class="text-muted text-sm">A leftover request already exists for this PR.</p>
							{/if}
						</div>
					{/if}
				</Card>
			{/if}
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

<Modal
	open={!!reassignLevel}
	title="Reassign approver"
	onclose={() => {
		reassignLevel = null;
		reassignUserId = '';
	}}
>
	{#if reassignLevel}
		<div class="space-y-4">
			<p class="text-muted text-sm">
				Choose a user with the correct role for this approval level.
			</p>
			<Select
				label="New approver"
				options={reassignOptions(reassignLevel)}
				bind:value={reassignUserId}
			/>
			<div class="flex justify-end gap-3">
				<Button
					variant="secondary"
					onclick={() => {
						reassignLevel = null;
						reassignUserId = '';
					}}
					disabled={reassigning}
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					loading={reassigning}
					disabled={!reassignUserId}
					onclick={handleReassign}
				>
					Save
				</Button>
			</div>
		</div>
	{/if}
</Modal>
