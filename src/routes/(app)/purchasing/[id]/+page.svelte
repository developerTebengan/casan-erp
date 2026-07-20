<script lang="ts">
	import {
		ArrowLeft,
		FileText,
		Truck,
		Calendar,
		User,
		Building,
		AlertCircle,
		MessageSquare
	} from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Button, DataTable } from '$lib/components/ui';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { PurchaseItem, ApprovalStatus } from '$lib/types';

	let { data } = $props();
	const purchase = $derived(data.purchase);

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
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card class="lg:col-span-2" padding="lg">
			<div class="mb-6 flex items-start justify-between">
				<div class="flex items-center gap-4">
					<div class="rounded-2xl bg-primary-100 p-4 text-primary-700 dark:bg-primary-900/30">
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
				<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<div class="text-accent-700 dark:bg-accent-900/30 rounded-lg bg-accent-100 p-2">
						<Truck class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Supplier</p>
						<p class="text-main font-semibold">{purchase.supplier?.name ?? 'Not specified'}</p>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<div class="text-warning-700 dark:bg-warning-900/30 rounded-lg bg-warning-100 p-2">
						<Calendar class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Date Required</p>
						<p class="text-main font-semibold">{formatDate(purchase.dateRequired)}</p>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<div class="text-success-700 dark:bg-success-900/30 rounded-lg bg-success-100 p-2">
						<Building class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Department</p>
						<p class="text-main font-semibold">{purchase.department}</p>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<div class="rounded-lg bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30">
						<User class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Requested By</p>
						<p class="text-main font-semibold">{purchase.requester?.name ?? '-'}</p>
					</div>
				</div>
			</div>

			{#if purchase.purpose}
				<div class="mb-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
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
				<div class="mb-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
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
					<div class="border-theme border-t pt-4">
						<div class="flex justify-between">
							<span class="text-muted">Requested By</span>
							<span class="text-main font-medium">{purchase.requester?.name ?? '-'}</span>
						</div>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted">Department Head</span>
						<div class="flex items-center gap-2">
							<span class="text-main font-medium">{approverName(purchase.departmentHead)}</span>
							{#if purchase.departmentHeadId}
								<Badge variant={approvalStatusVariant(purchase.departmentHeadStatus)}>
									{approvalStatusLabel(purchase.departmentHeadStatus)}
								</Badge>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted">Finance Department</span>
						<div class="flex items-center gap-2">
							<span class="text-main font-medium">{approverName(purchase.financeApprover)}</span>
							{#if purchase.financeApproverId}
								<Badge variant={approvalStatusVariant(purchase.financeStatus)}>
									{approvalStatusLabel(purchase.financeStatus)}
								</Badge>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted">Final Approval</span>
						<div class="flex items-center gap-2">
							<span class="text-main font-medium">{approverName(purchase.finalApprover)}</span>
							{#if purchase.finalApproverId}
								<Badge variant={approvalStatusVariant(purchase.finalStatus)}>
									{approvalStatusLabel(purchase.finalStatus)}
								</Badge>
							{/if}
						</div>
					</div>
				</div>
			</Card>
		</div>
	</div>
</div>
