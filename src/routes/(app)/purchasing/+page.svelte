<script lang="ts">
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus, Trash2, FileText } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		DataTable,
		Pagination,
		Breadcrumb,
		Badge,
		ConfirmDialog,
		EmptyState,
		Spinner
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { Purchase, Supplier } from '$lib/types';

	let { data } = $props();

	let purchases = $state<Purchase[]>(untrack(() => data.purchases.data));
	let pagination = $state(untrack(() => data.purchases.pagination));
	let suppliers = $state<Supplier[]>(untrack(() => data.suppliers));
	let search = $state('');
	let supplierId = $state('');
	let status = $state('');
	let loading = $state(false);
	let deleteId = $state<string | null>(null);
	let deleting = $state(false);

	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'DRAFT', label: 'Draft' },
		{ value: 'ORDERED', label: 'Ordered' },
		{ value: 'RECEIVED', label: 'Received' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	const supplierOptions = $derived([
		{ value: '', label: 'All Suppliers' },
		...suppliers.map((s) => ({ value: s.id, label: s.name }))
	]);

	async function loadPurchases(page = 1) {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			if (supplierId) params.set('supplierId', supplierId);
			if (status) params.set('status', status);
			params.set('page', String(page));
			params.set('limit', '10');

			const res = await fetch(`/api/purchases?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				purchases = result.data;
				pagination = result.pagination;
			}
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadPurchases(1);
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleting = true;
		try {
			const res = await fetch(`/api/purchases/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				toastStore.success('Purchase order deleted successfully');
				await loadPurchases(pagination.page);
			} else {
				toastStore.error('Failed to delete purchase order');
			}
		} finally {
			deleting = false;
			deleteId = null;
		}
	}

	function statusBadge(p: Purchase) {
		const variants: Record<string, string> = {
			DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
			ORDERED: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
			RECEIVED: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
			CANCELLED: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
		};
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[p.status]}">${p.status}</span>`;
	}

	function actionsCell(p: Purchase) {
		return `
			<div class="flex items-center gap-2">
				<a href="/purchasing/${p.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
				</a>
				<button type="button" data-delete="${p.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</button>
			</div>
		`;
	}

	const columns = [
		{ key: 'poNumber', header: 'PO Number' },
		{ key: 'supplier', header: 'Supplier', cell: (p: Purchase) => p.supplier?.name ?? '-' },
		{ key: 'purchaseDate', header: 'Date', cell: (p: Purchase) => formatDate(p.purchaseDate) },
		{ key: 'status', header: 'Status', cell: statusBadge },
		{ key: 'total', header: 'Total', cell: (p: Purchase) => formatCurrency(p.total) },
		{ key: 'actions', header: '', cell: actionsCell }
	];

	function handleRowClick(row: Purchase, e: MouseEvent) {
		const target = e.target as HTMLElement;
		const deleteBtn = target.closest('[data-delete]') as HTMLElement | null;
		if (deleteBtn) {
			deleteId = deleteBtn.dataset.delete ?? null;
			return;
		}
		goto(`/purchasing/${row.id}`);
	}

	onMount(() => {
		if (!purchases.length) loadPurchases();
	});
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Purchasing' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Purchase Orders</h1>
			<p class="text-muted">Manage your purchase orders and supplier transactions</p>
		</div>
		<Button href="/purchasing/new" variant="primary">
			<Plus class="h-4 w-4" />
			Create PO
		</Button>
	</div>

	<Card padding="md">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
			<div class="flex-1">
				<Input
					label="Search"
					placeholder="Search by PO number..."
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
					label="Status"
					options={statusOptions}
					bind:value={status}
					onchange={handleSearch}
				/>
			</div>
		</div>
	</Card>

	{#if loading && purchases.length === 0}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if purchases.length === 0}
		<EmptyState
			title="No purchase orders found"
			description="Start by creating a new purchase order."
		>
			<Button href="/purchasing/new" variant="primary">
				<Plus class="h-4 w-4" />
				Create PO
			</Button>
		</EmptyState>
	{:else}
		<DataTable {columns} rows={purchases} {loading} onrowclick={handleRowClick} />
		<Pagination {...pagination} onpagechange={loadPurchases} />
	{/if}

	<ConfirmDialog
		open={!!deleteId}
		title="Delete Purchase Order"
		message="Are you sure you want to delete this purchase order? This action cannot be undone."
		confirmText="Delete"
		loading={deleting}
		onconfirm={handleDelete}
		oncancel={() => (deleteId = null)}
	/>
</div>
