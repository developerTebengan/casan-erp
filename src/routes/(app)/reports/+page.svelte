<script lang="ts">
	import { Download } from '@lucide/svelte';
	import { Card, Breadcrumb, Button, Input, DataTable, Spinner } from '$lib/components/ui';
	import { formatCurrency, formatDate, formatDateTime, formatNumber } from '$lib/utils/format';
	import { toastStore } from '$lib/stores/toast.svelte';

	let { data } = $props();

	type Tab =
		| 'stock-movements'
		| 'low-stock'
		| 'valuation'
		| 'purchasing-spend'
		| 'open-orders';

	let activeTab = $state<Tab>('stock-movements');
	let from = $state(data.defaultFrom);
	let to = $state(data.defaultTo);
	let loading = $state(false);
	let rows = $state<Record<string, unknown>[]>([]);

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'stock-movements', label: 'Stock movements' },
		{ id: 'low-stock', label: 'Low stock' },
		{ id: 'valuation', label: 'Valuation by category' },
		{ id: 'purchasing-spend', label: 'Spend by supplier' },
		{ id: 'open-orders', label: 'Open orders aging' }
	];

	const needsDate = $derived(
		activeTab === 'stock-movements' || activeTab === 'purchasing-spend'
	);

	function apiPath(tab: Tab, format?: 'csv') {
		const params = new URLSearchParams();
		if (needsDate) {
			if (from) params.set('from', from);
			if (to) params.set('to', to);
		}
		if (format) params.set('format', format);
		const q = params.toString();
		const base =
			tab === 'stock-movements'
				? '/api/reports/stock-movements'
				: tab === 'low-stock'
					? '/api/reports/low-stock'
					: tab === 'valuation'
						? '/api/reports/valuation'
						: tab === 'purchasing-spend'
							? '/api/reports/purchasing-spend'
							: '/api/reports/open-orders';
		return q ? `${base}?${q}` : base;
	}

	async function loadReport() {
		loading = true;
		try {
			const res = await fetch(apiPath(activeTab));
			if (!res.ok) {
				toastStore.error('Failed to load report');
				rows = [];
				return;
			}
			rows = await res.json();
		} finally {
			loading = false;
		}
	}

	function downloadCsv() {
		window.location.href = apiPath(activeTab, 'csv');
	}

	$effect(() => {
		activeTab;
		from;
		to;
		loadReport();
	});

	const columns = $derived.by(() => {
		if (activeTab === 'stock-movements') {
			return [
				{
					key: 'date',
					header: 'Date',
					cell: (r: Record<string, unknown>) => formatDateTime(String(r.date))
				},
				{ key: 'productCode', header: 'Code' },
				{ key: 'productName', header: 'Product' },
				{ key: 'type', header: 'Type' },
				{ key: 'source', header: 'Source' },
				{ key: 'qty', header: 'Qty', cell: (r: Record<string, unknown>) => String(r.qty) },
				{ key: 'warehouse', header: 'Warehouse' }
			];
		}
		if (activeTab === 'low-stock') {
			return [
				{ key: 'code', header: 'Code' },
				{ key: 'name', header: 'Name' },
				{ key: 'category', header: 'Category' },
				{
					key: 'stock',
					header: 'Stock',
					cell: (r: Record<string, unknown>) => `${r.stock} / ${r.minimumStock}`
				},
				{ key: 'unit', header: 'Unit' }
			];
		}
		if (activeTab === 'valuation') {
			return [
				{ key: 'categoryName', header: 'Category' },
				{
					key: 'productCount',
					header: 'Products',
					cell: (r: Record<string, unknown>) => String(r.productCount)
				},
				{
					key: 'totalQty',
					header: 'Qty',
					cell: (r: Record<string, unknown>) => formatNumber(Number(r.totalQty))
				},
				{
					key: 'value',
					header: 'Value',
					cell: (r: Record<string, unknown>) => formatCurrency(Number(r.value))
				}
			];
		}
		if (activeTab === 'purchasing-spend') {
			return [
				{ key: 'supplierName', header: 'Supplier' },
				{
					key: 'orderCount',
					header: 'Orders',
					cell: (r: Record<string, unknown>) => String(r.orderCount)
				},
				{
					key: 'totalSpend',
					header: 'Spend',
					cell: (r: Record<string, unknown>) => formatCurrency(Number(r.totalSpend))
				}
			];
		}
		return [
			{ key: 'prNumber', header: 'PR' },
			{ key: 'supplier', header: 'Supplier' },
			{
				key: 'dateRequired',
				header: 'Required',
				cell: (r: Record<string, unknown>) => formatDate(String(r.dateRequired))
			},
			{
				key: 'remainingQty',
				header: 'Remaining',
				cell: (r: Record<string, unknown>) => String(r.remainingQty)
			},
			{
				key: 'ageDays',
				header: 'Age (days)',
				cell: (r: Record<string, unknown>) => String(r.ageDays)
			},
			{
				key: 'overdue',
				header: 'Overdue',
				cell: (r: Record<string, unknown>) => (r.overdue ? 'Yes' : 'No')
			}
		];
	});
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Reports' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Reports</h1>
			<p class="text-muted">Inventory and purchasing analytics with CSV export</p>
		</div>
		<Button variant="secondary" onclick={downloadCsv}>
			<Download class="h-4 w-4" />
			Download CSV
		</Button>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each tabs as tab}
			<button
				type="button"
				class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab === tab.id
					? 'bg-primary-600 text-white'
					: 'bg-card-secondary text-main hover:bg-primary-50 dark:hover:bg-primary-900/20'}"
				onclick={() => (activeTab = tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if needsDate}
		<Card padding="md">
			<div class="grid gap-4 sm:grid-cols-3">
				<Input label="From" type="date" bind:value={from} />
				<Input label="To" type="date" bind:value={to} />
				<div class="flex items-end">
					<Button variant="primary" onclick={loadReport} {loading}>Apply</Button>
				</div>
			</div>
		</Card>
	{/if}

	{#if loading && rows.length === 0}
		<div class="flex h-48 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if rows.length === 0}
		<Card padding="md">
			<p class="text-muted text-center text-sm">No data for this report.</p>
		</Card>
	{:else}
		<DataTable columns={columns} rows={rows} {loading} />
	{/if}
</div>
