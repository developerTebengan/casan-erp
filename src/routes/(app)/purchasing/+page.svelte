<script lang="ts">
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus, Trash2, Eye, Printer } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		DataTable,
		Pagination,
		Breadcrumb,
		ConfirmDialog,
		StatusStatTabs
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { t } from '$lib/i18n';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { ApprovalStatus, Purchase, Supplier } from '$lib/types';

	let { data } = $props();

	let purchases = $state<Purchase[]>(untrack(() => data.purchases.data));
	let pagination = $state(untrack(() => data.purchases.pagination));
	let suppliers = $state<Supplier[]>(untrack(() => data.suppliers));
	let statusCounts = $state(
		untrack(() => data.statusCounts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0, ALL: 0 })
	);
	let statusTab = $state(untrack(() => (data.initialStatus as string) || 'PENDING'));
	let search = $state('');
	let supplierId = $state('');
	let priority = $state('');
	let loading = $state(false);
	let deleteId = $state<string | null>(null);
	let deleting = $state(false);
	let pageSize = $state(10);
	let sortKey = $state<string | undefined>();
	let sortDir = $state<'asc' | 'desc'>('asc');

	const priorityOptions = [
		{ value: '', label: 'All Priorities' },
		{ value: 'LOW', label: 'Low' },
		{ value: 'MEDIUM', label: 'Medium' },
		{ value: 'HIGH', label: 'High' },
		{ value: 'URGENT', label: 'Urgent' }
	];

	const supplierOptions = $derived([
		{ value: '', label: 'All Suppliers' },
		...suppliers.map((s) => ({ value: s.id, label: s.name }))
	]);

	const statusTabs = $derived([
		{
			id: 'PENDING',
			label: 'Waiting',
			count: statusCounts.PENDING ?? 0,
			variant: 'warning' as const
		},
		{
			id: 'APPROVED',
			label: 'Approved',
			count: statusCounts.APPROVED ?? 0,
			variant: 'success' as const
		},
		{
			id: 'REJECTED',
			label: 'Unapproved',
			count: statusCounts.REJECTED ?? 0,
			variant: 'danger' as const
		},
		{
			id: 'ALL',
			label: 'All',
			count: statusCounts.ALL ?? 0,
			variant: 'secondary' as const
		}
	]);

	async function resolvePageSize() {
		try {
			const res = await fetch('/api/settings');
			if (!res.ok) return;
			const settings = await res.json();
			const n = Number(settings.itemsPerPage);
			if (Number.isFinite(n) && n > 0) pageSize = n;
		} catch {
			pageSize = 10;
		}
	}

	async function loadPurchases(page = 1) {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			if (supplierId) params.set('supplierId', supplierId);
			if (priority) params.set('priority', priority);
			if (statusTab && statusTab !== 'ALL') params.set('approvalStatus', statusTab);
			params.set('page', String(page));
			params.set('limit', String(pageSize));
			if (sortKey) {
				params.set('sort', sortKey);
				params.set('order', sortDir);
			}

			const res = await fetch(`/api/purchases?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				purchases = result.data;
				pagination = result.pagination;
				if (result.statusCounts) statusCounts = result.statusCounts;
			}
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadPurchases(1);
	}

	function switchStatus(id: string) {
		statusTab = id;
		loadPurchases(1);
	}

	function handleSort(key: string, nextDir: 'asc' | 'desc') {
		sortKey = key;
		sortDir = nextDir;
		loadPurchases(1);
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleting = true;
		try {
			const res = await fetch(`/api/purchases/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				toastStore.success('Purchasing request deleted successfully');
				await loadPurchases(pagination.page);
			} else {
				toastStore.error('Failed to delete purchasing request');
			}
		} finally {
			deleting = false;
			deleteId = null;
		}
	}

	function priorityBadge(p: Purchase) {
		const variants: Record<string, string> = {
			LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
			MEDIUM: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-600',
			HIGH: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600',
			URGENT: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600'
		};
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[p.priority]}">${p.priority}</span>`;
	}

	function statusBadge(p: Purchase) {
		function approvalStatusVariant(status: ApprovalStatus) {
			if (status === 'APPROVED')
				return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600';
			if (status === 'REJECTED')
				return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600';
			return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600';
		}

		function approvalStatusLabel(status: ApprovalStatus) {
			if (status === 'APPROVED') return 'Approved';
			if (status === 'REJECTED') return 'Unapproved';
			return 'Waiting';
		}

		const variantClass = approvalStatusVariant(p.approvalStatus);
		const label = approvalStatusLabel(p.approvalStatus);
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClass}">${label}</span>`;
	}

	function deadlineCell(p: Purchase) {
		const d = p.decisionDeadline || p.dateRequired;
		const date = new Date(d);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const due = new Date(date);
		due.setHours(0, 0, 0, 0);
		const pending = p.approvalStatus === 'PENDING';
		const overdue = pending && due < today;
		const dueSoon =
			pending && !overdue && (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 2;
		const classes = overdue
			? 'text-danger-600 font-semibold'
			: dueSoon
				? 'text-warning-700 font-medium'
				: '';
		const suffix = overdue ? ' · overdue' : dueSoon ? ' · due soon' : '';
		return `<span class="${classes}">${formatDate(d)}${suffix}</span>`;
	}

	const columns = [
		{ key: 'prNumber', header: 'PR Number', sortKey: 'prNumber' },
		{ key: 'supplier', header: 'Supplier', cell: (p: Purchase) => p.supplier?.name ?? '-' },
		{
			key: 'dateOfRequest',
			header: 'Date of Request',
			sortKey: 'dateOfRequest',
			cell: (p: Purchase) => formatDate(p.dateOfRequest)
		},
		{ key: 'deadline', header: 'Decision by', sortKey: 'decisionDeadline', cell: deadlineCell },
		{ key: 'priority', header: 'Priority', cell: priorityBadge },
		{ key: 'status', header: 'Status', cell: statusBadge },
		{ key: 'total', header: 'Total', cell: (p: Purchase) => formatCurrency(p.total) }
	];

	function handleRowClick(row: Purchase, e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('a, button')) return;
		goto(`/purchasing/${row.id}`);
	}

	onMount(async () => {
		await resolvePageSize();
		await loadPurchases(pagination.page);
	});
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Purchasing Request' }]} class="print:hidden" />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Purchasing Requests</h1>
			<p class="text-muted">Manage your purchasing requests and supplier transactions</p>
		</div>
		<Button href="/purchasing/new" variant="primary">
			<Plus class="h-4 w-4" />
			Create PR
		</Button>
	</div>

	<div class="print:hidden">
		<StatusStatTabs tabs={statusTabs} active={statusTab} onchange={switchStatus} />
	</div>

	<Card padding="md" class="print:hidden">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
			<div class="flex-1">
				<Input
					label="Search"
					placeholder="Search by PR number..."
					bind:value={search}
					oninput={handleSearch}
				/>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-[400px]">
				<Select
					label="Supplier"
					options={supplierOptions}
					bind:value={supplierId}
					onchange={handleSearch}
				/>
				<Select
					label="Priority"
					options={priorityOptions}
					bind:value={priority}
					onchange={handleSearch}
				/>
			</div>
		</div>
	</Card>

	<div class="space-y-3 md:hidden print:hidden">
		{#each purchases as p (p.id)}
			<Card padding="md">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="text-main font-semibold">{p.prNumber}</p>
						<div class="mt-2">{@html statusBadge(p)}</div>
					</div>
					<a href="/purchasing/{p.id}" class="text-sm font-medium text-primary-600 hover:underline">
						{t('table.open', localeStore.value)}
					</a>
				</div>
			</Card>
		{/each}
	</div>

	{#snippet purchaseActions(p: Purchase)}
		<div class="flex items-center gap-2">
			<a
				href="/purchasing/{p.id}"
				class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
				aria-label={t('table.view', localeStore.value)}
			>
				<Eye class="h-4 w-4" />
			</a>
			<a
				href="/purchasing/{p.id}/print"
				class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
				title="Print PR"
				aria-label={t('table.print', localeStore.value)}
			>
				<Printer class="h-4 w-4" />
			</a>
			{#if data.user.role === 'ADMIN' || data.user.id === p.requesterId}
				<button
					type="button"
					class="dark:hover:bg-danger-900/20 inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600"
					onclick={() => (deleteId = p.id)}
					aria-label={t('table.delete', localeStore.value)}
				>
					<Trash2 class="h-4 w-4" />
				</button>
			{/if}
		</div>
	{/snippet}

	<div class={purchases.length === 0 ? '' : 'hidden md:block'}>
		<DataTable
			columns={[...columns, { key: 'actions', header: '', render: purchaseActions }]}
			rows={purchases}
			{loading}
			{sortKey}
			{sortDir}
			onsort={handleSort}
			onrowclick={handleRowClick}
		>
			{#snippet empty()}
				<Button href="/purchasing/new" variant="primary">
					<Plus class="h-4 w-4" />
					Create PR
				</Button>
			{/snippet}
		</DataTable>
	</div>
	{#if pagination.total > 0}
		<Pagination {...pagination} onpagechange={loadPurchases} class="print:hidden" />
	{/if}

	<ConfirmDialog
		class="print:hidden"
		open={!!deleteId}
		title="Delete Purchasing Request"
		message="Are you sure you want to delete this purchasing request? This action cannot be undone."
		confirmText="Delete"
		loading={deleting}
		onconfirm={handleDelete}
		oncancel={() => (deleteId = null)}
	/>
</div>
