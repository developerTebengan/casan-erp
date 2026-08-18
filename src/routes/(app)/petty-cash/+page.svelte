<script lang="ts">
	import { untrack } from 'svelte';
	import { Download, Wallet } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		DataTable,
		Pagination,
		Breadcrumb,
		Modal
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDateTime } from '$lib/utils/format';
	import { hasPermission } from '$lib/permissions';
	import type { PettyCashTransaction, PettyCashType } from '$lib/types';

	let { data } = $props();
	const canWrite = $derived(hasPermission(data.user.role, 'pettyCash:write'));
	const canBuy = $derived(hasPermission(data.user.role, 'stock:write'));

	let summary = $state(untrack(() => data.summary));
	let amount = $state('');
	let note = $state('');
	let from = $state('');
	let to = $state('');
	let type = $state<PettyCashType | ''>('');
	let loading = $state(false);
	let errors = $state<Record<string, string>>({});
	let editing = $state<PettyCashTransaction | null>(null);
	let editAmount = $state('');
	let editNote = $state('');
	let editLoading = $state(false);
	let editErrors = $state<Record<string, string>>({});

	const typeOptions = [
		{ value: '', label: 'All types' },
		{ value: 'TOP_UP', label: 'Top up' },
		{ value: 'SPEND', label: 'Spend' },
		{ value: 'REFUND', label: 'Refund' }
	];

	function typeLabel(row: PettyCashTransaction) {
		if (row.type === 'TOP_UP') return 'Top up';
		if (row.type === 'SPEND') return 'Spend';
		return 'Refund';
	}

	function typeBadge(row: PettyCashTransaction) {
		const variants: Record<PettyCashType, string> = {
			TOP_UP: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600',
			SPEND: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600',
			REFUND: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-500'
		};
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[row.type]}">${typeLabel(row)}</span>`;
	}

	function query() {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		if (type) params.set('type', type);
		return params.toString();
	}

	function exportHref() {
		const extra = query();
		return `/api/petty-cash?export=1${extra ? `&${extra}` : ''}`;
	}

	const columns = $derived([
		{
			key: 'createdAt',
			header: 'Date',
			cell: (row: PettyCashTransaction) => formatDateTime(row.createdAt)
		},
		{ key: 'type', header: 'Type', cell: typeBadge },
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
		{ key: 'note', header: 'Note', cell: (row: PettyCashTransaction) => row.note || '—' },
		{
			key: 'actions',
			header: '',
			cell: (row: PettyCashTransaction) =>
				canWrite && row.type === 'TOP_UP'
					? `<button type="button" class="text-primary-600 hover:underline" data-edit="${row.id}">Edit</button>`
					: '—'
		}
	]);

	function openEdit(id: string) {
		const row = summary.transactions.find((tx) => tx.id === id);
		if (!row || row.type !== 'TOP_UP') return;
		editing = row;
		editAmount = String(row.amount);
		editNote = row.note ?? '';
		editErrors = {};
	}

	function handleLedgerClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-edit]');
		if (!btn) return;
		e.preventDefault();
		openEdit(btn.getAttribute('data-edit') ?? '');
	}

	async function loadPage(page = 1) {
		const extra = query();
		const res = await fetch(
			`/api/petty-cash?page=${page}&limit=20${extra ? `&${extra}` : ''}`
		);
		if (res.ok) summary = await res.json();
	}

	async function saveEdit() {
		if (!editing) return;
		editLoading = true;
		editErrors = {};
		try {
			const res = await fetch(`/api/petty-cash/${editing.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount: Number(editAmount), note: editNote || null })
			});
			if (res.ok) {
				toastStore.success('Top-up updated');
				editing = null;
				await loadPage(summary.pagination.page);
			} else {
				const err = await res.json().catch(() => ({}));
				editErrors = Object.fromEntries(
					Object.entries(err.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(err.errors?.amount?.[0] || err.message || 'Failed to update top-up');
			}
		} finally {
			editLoading = false;
		}
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
			<p class="text-muted">Cash box for manual stock buys. Filter the ledger, export CSV, or top up.</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<Button href={exportHref()} variant="secondary">
				<Download class="h-4 w-4" />
				Export CSV
			</Button>
			<Button href="/petty-cash/refunds" variant="secondary">Refund list</Button>
			{#if canBuy}
				<Button href="/stock/petty-cash" variant="primary">
					<Wallet class="h-4 w-4" />
					Buy with petty cash
				</Button>
			{/if}
		</div>
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

	<Card padding="md">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
			<Input label="From" type="date" bind:value={from} onchange={() => loadPage(1)} />
			<Input label="To" type="date" bind:value={to} onchange={() => loadPage(1)} />
			<Select
				label="Type"
				options={typeOptions}
				bind:value={type}
				onchange={() => loadPage(1)}
			/>
			<Button variant="secondary" onclick={() => loadPage(1)}>Filter</Button>
		</div>
	</Card>

	<div onclick={handleLedgerClick} role="presentation">
		<DataTable columns={columns} rows={summary.transactions} />
	</div>
	{#if summary.pagination.total > 0}
		<Pagination {...summary.pagination} onpagechange={loadPage} />
	{/if}
</div>

<Modal open={!!editing} title="Edit top-up" onclose={() => (editing = null)}>
	<div class="space-y-4">
		<Input
			label="Amount"
			type="number"
			min="1"
			bind:value={editAmount}
			required
			error={editErrors.amount || editErrors.form}
		/>
		<Input label="Note" bind:value={editNote} placeholder="Source of cash..." />
	</div>
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (editing = null)}>Cancel</Button>
		<Button variant="primary" loading={editLoading} onclick={saveEdit}>Save</Button>
	{/snippet}
</Modal>
