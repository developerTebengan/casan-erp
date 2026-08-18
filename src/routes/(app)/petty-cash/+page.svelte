<script lang="ts">
	import { untrack } from 'svelte';
	import { Wallet } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		DataTable,
		Pagination,
		Breadcrumb
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDateTime } from '$lib/utils/format';
	import { hasPermission } from '$lib/permissions';
	import type { PettyCashTransaction } from '$lib/types';

	let { data } = $props();
	const canWrite = $derived(hasPermission(data.user.role, 'pettyCash:write'));

	let summary = $state(untrack(() => data.summary));
	let amount = $state('');
	let note = $state('');
	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	function typeLabel(row: PettyCashTransaction) {
		if (row.type === 'TOP_UP') return 'Top up';
		if (row.type === 'SPEND') return 'Spend';
		return 'Refund';
	}

	const columns = [
		{
			key: 'createdAt',
			header: 'Date',
			cell: (row: PettyCashTransaction) => formatDateTime(row.createdAt)
		},
		{ key: 'type', header: 'Type', cell: typeLabel },
		{
			key: 'amount',
			header: 'Amount',
			cell: (row: PettyCashTransaction) => formatCurrency(row.amount)
		},
		{
			key: 'balanceAfter',
			header: 'Balance after',
			cell: (row: PettyCashTransaction) => formatCurrency(row.balanceAfter)
		},
		{
			key: 'product',
			header: 'Product',
			cell: (row: PettyCashTransaction) =>
				row.product ? `${row.product.code} — ${row.product.name}` : '—'
		},
		{ key: 'note', header: 'Note', cell: (row: PettyCashTransaction) => row.note || '—' }
	];

	async function loadPage(page = 1) {
		const res = await fetch(`/api/petty-cash?page=${page}&limit=20`);
		if (res.ok) summary = await res.json();
	}

	async function handleTopUp(e: Event) {
		e.preventDefault();
		if (!canWrite) return;
		loading = true;
		errors = {};
		try {
			const res = await fetch('/api/petty-cash', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount: Number(amount), note: note || null })
			});
			if (res.ok) {
				toastStore.success('Petty cash topped up');
				amount = '';
				note = '';
				await loadPage(1);
			} else {
				const err = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(err.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(err.message || 'Failed to top up');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Petty cash' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Petty cash</h1>
			<p class="text-muted">Cash box for manual stock buys. Admin and Finance can top up.</p>
		</div>
		<Button href="/petty-cash/refunds" variant="secondary">Refund list</Button>
	</div>

	<Card padding="lg">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-primary-100 p-3 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
				<Wallet class="h-6 w-6" />
			</div>
			<div>
				<p class="text-muted text-sm">Current balance</p>
				<p class="text-main text-2xl font-bold">{formatCurrency(summary.balance)}</p>
			</div>
		</div>
	</Card>

	{#if canWrite}
		<Card padding="lg">
			<h2 class="text-main mb-4 text-lg font-semibold">Top up</h2>
			<form onsubmit={handleTopUp} class="grid gap-4 sm:grid-cols-3 sm:items-end">
				<Input
					label="Amount"
					name="amount"
					type="number"
					min="1"
					bind:value={amount}
					required
					error={errors.amount}
				/>
				<Input label="Note" name="note" bind:value={note} placeholder="Source of cash..." />
				<Button type="submit" variant="primary" {loading}>Top up</Button>
			</form>
		</Card>
	{/if}

	<DataTable columns={columns} rows={summary.transactions} />
	{#if summary.pagination.total > 0}
		<Pagination {...summary.pagination} onpagechange={loadPage} />
	{/if}
</div>
