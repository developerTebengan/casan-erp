<script lang="ts">
	import { untrack } from 'svelte';
	import { Download } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		DataTable,
		Pagination,
		Breadcrumb
	} from '$lib/components/ui';
	import { formatCurrency, formatDateTime } from '$lib/utils/format';
	import type { PettyCashTransaction } from '$lib/types';

	let { data } = $props();
	let summary = $state(untrack(() => data.summary));
	let from = $state('');
	let to = $state('');

	function query() {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return params.toString();
	}

	async function loadPage(page = 1) {
		const extra = query();
		const res = await fetch(
			`/api/petty-cash/refunds?page=${page}&limit=20${extra ? `&${extra}` : ''}`
		);
		if (res.ok) summary = await res.json();
	}

	const columns = [
		{
			key: 'createdAt',
			header: 'Date',
			cell: (row: PettyCashTransaction) => formatDateTime(row.createdAt)
		},
		{
			key: 'product',
			header: 'Product',
			cell: (row: PettyCashTransaction) =>
				row.product ? `${row.product.code} — ${row.product.name}` : '—'
		},
		{ key: 'qty', header: 'Qty', cell: (row: PettyCashTransaction) => String(row.qty ?? '—') },
		{
			key: 'expected',
			header: 'Catalog total',
			cell: (row: PettyCashTransaction) => formatCurrency(row.expectedAmount ?? 0)
		},
		{
			key: 'paid',
			header: 'Paid',
			cell: (row: PettyCashTransaction) => formatCurrency(row.paidAmount ?? 0)
		},
		{
			key: 'refund',
			header: 'Refund to petty cash',
			cell: (row: PettyCashTransaction) => formatCurrency(row.amount)
		},
		{ key: 'note', header: 'Note', cell: (row: PettyCashTransaction) => row.note || '—' }
	];
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Petty cash', href: '/petty-cash' }, { label: 'Refund list' }]}
	/>

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Refund list</h1>
			<p class="text-muted">Unused catalog budget when the shop price was lower than catalog.</p>
		</div>
		<Button
			href={`/api/petty-cash/refunds?export=1${query() ? `&${query()}` : ''}`}
			variant="secondary"
		>
			<Download class="h-4 w-4" />
			Export CSV
		</Button>
	</div>

	<Card padding="md">
		<div class="grid gap-4 sm:grid-cols-3 sm:items-end">
			<Input label="From" type="date" bind:value={from} />
			<Input label="To" type="date" bind:value={to} />
			<Button variant="secondary" onclick={() => loadPage(1)}>Filter</Button>
		</div>
	</Card>

	<DataTable columns={columns} rows={summary.transactions} />
	{#if summary.pagination.total > 0}
		<Pagination {...summary.pagination} onpagechange={loadPage} />
	{/if}
</div>
