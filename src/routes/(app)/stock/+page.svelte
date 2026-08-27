<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		DataTable,
		Pagination,
		Breadcrumb,
		EmptyState,
		Spinner
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatNumber } from '$lib/utils/format';
	import type { StockTransaction, Product, StockTransactionType } from '$lib/types';

	let { data } = $props();

	let transactions = $state<StockTransaction[]>(untrack(() => data.transactions.data));
	let pagination = $state(untrack(() => data.transactions.pagination));
	let products = $state<Product[]>(untrack(() => data.products));
	let search = $state('');
	let productId = $state('');
	let type = $state<StockTransactionType | ''>('');
	let loading = $state(false);

	const typeOptions = [
		{ value: '', label: 'All Types' },
		{ value: 'IN', label: 'Stock In' },
		{ value: 'OUT', label: 'Stock Out' },
		{ value: 'ADJUSTMENT', label: 'Adjustment' }
	];

	const productOptions = $derived([
		{ value: '', label: 'All Products' },
		...products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
	]);

	function typeBadge(tx: StockTransaction) {
		const variants: Record<StockTransactionType, string> = {
			IN: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600',
			OUT: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600',
			ADJUSTMENT: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-500',
			TRANSFER: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-500'
		};
		const labels: Record<StockTransactionType, string> = {
			IN: 'IN',
			OUT: 'OUT',
			ADJUSTMENT: 'ADJ',
			TRANSFER: 'TRF'
		};
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[tx.type]}">${labels[tx.type]}</span>`;
	}

	function sourceCell(tx: StockTransaction) {
		if (tx.source === 'PURCHASE' && tx.referenceId) {
			return `<a href="/purchasing/${tx.referenceId}" class="text-primary-600 hover:underline" onclick="event.stopPropagation()">PR</a>`;
		}
		return tx.source;
	}

	async function loadTransactions(page = 1) {
		loading = true;
		try {
			const params: string[] = [];
			if (search) params.push(`search=${encodeURIComponent(search)}`);
			if (productId) params.push(`productId=${encodeURIComponent(productId)}`);
			if (type) params.push(`type=${encodeURIComponent(type)}`);
			params.push(`page=${page}`, 'limit=10');

			const res = await fetch(`/api/stock?${params.join('&')}`);
			if (res.ok) {
				const result = await res.json();
				transactions = result.data;
				pagination = result.pagination;
			} else {
				toastStore.error('Failed to load stock transactions');
			}
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadTransactions(1);
	}

	const columns = [
		{
			key: 'product',
			header: 'Product',
			cell: (tx: StockTransaction) =>
				tx.product ? `${tx.product.code} — ${tx.product.name}` : '-'
		},
		{ key: 'type', header: 'Type', cell: typeBadge },
		{ key: 'source', header: 'Source', cell: sourceCell },
		{ key: 'qty', header: 'Qty', cell: (tx: StockTransaction) => formatNumber(tx.qty) },
		{
			key: 'stockBefore',
			header: 'Before',
			cell: (tx: StockTransaction) => formatNumber(tx.stockBefore)
		},
		{
			key: 'stockAfter',
			header: 'After',
			cell: (tx: StockTransaction) => formatNumber(tx.stockAfter)
		},
		{ key: 'note', header: 'Note', cell: (tx: StockTransaction) => tx.note || '-' },
		{
			key: 'createdAt',
			header: 'Date',
			cell: (tx: StockTransaction) => formatDateTime(tx.createdAt)
		}
	];
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Stock Movement' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Stock Movement</h1>
			<p class="text-muted">Track stock in, stock out, and adjustments. Click a row for detail / reverse.</p>
		</div>
		<Button href="/stock/new" variant="primary">
			<Plus class="h-4 w-4" />
			New Transaction
		</Button>
	</div>

	<Card padding="md">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
			<div class="flex-1">
				<Input
					label="Search"
					placeholder="Search product code or name..."
					bind:value={search}
					oninput={handleSearch}
				/>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-[500px]">
				<Select
					label="Product"
					options={productOptions}
					bind:value={productId}
					onchange={handleSearch}
				/>
				<Select label="Type" options={typeOptions} bind:value={type} onchange={handleSearch} />
			</div>
		</div>
	</Card>

	{#if loading && transactions.length === 0}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if transactions.length === 0}
		<EmptyState
			title="No transactions found"
			description="Record your first stock in or stock out transaction."
		>
			<Button href="/stock/new" variant="primary">
				<Plus class="h-4 w-4" />
				New Transaction
			</Button>
		</EmptyState>
	{:else}
		<DataTable
			{columns}
			rows={transactions}
			{loading}
			onrowclick={(row, e) => {
				if ((e.target as HTMLElement).closest('a')) return;
				goto(`/stock/${(row as StockTransaction).id}`);
			}}
		/>
		<Pagination {...pagination} onpagechange={loadTransactions} />
	{/if}
</div>
