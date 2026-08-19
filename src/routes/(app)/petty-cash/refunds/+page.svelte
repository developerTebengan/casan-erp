<script lang="ts">
	import { untrack } from 'svelte';
	import { Download } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		DataTable,
		Pagination,
		Breadcrumb,
		Modal,
		Textarea
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDateTime } from '$lib/utils/format';
	import { hasPermission } from '$lib/permissions';

	let { data } = $props();
	const canWrite = $derived(hasPermission(data.user.role, 'pettyCash:write'));
	let queue = $state(untrack(() => data.queue));
	let tab = $state<'pending' | 'posted'>('pending');
	let kind = $state('');
	let destination = $state('');
	let from = $state('');
	let to = $state('');
	let rejectId = $state('');
	let rejectReason = $state('');
	let decideLoading = $state(false);

	function query() {
		const params = new URLSearchParams();
		params.set('tab', tab);
		if (kind) params.set('kind', kind);
		if (destination) params.set('destination', destination);
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return params.toString();
	}

	async function loadPage(page = 1) {
		const res = await fetch(`/api/petty-cash/refunds?${query()}&page=${page}&limit=20`);
		if (res.ok) queue = await res.json();
	}

	async function decide(id: string, action: 'approve' | 'reject', reason?: string) {
		decideLoading = true;
		try {
			const res = await fetch(`/api/petty-cash/refunds/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, reason })
			});
			if (res.ok) {
				toastStore.success(action === 'approve' ? 'Refund approved' : 'Refund rejected');
				rejectId = '';
				rejectReason = '';
				await loadPage(queue.pagination.page);
			} else {
				const err = await res.json().catch(() => ({}));
				toastStore.error(err.errors?.reason?.[0] || err.message || 'Failed');
			}
		} finally {
			decideLoading = false;
		}
	}

	type Row = (typeof queue.rows)[number];

	const columns = $derived([
		{
			key: 'createdAt',
			header: 'Date',
			cell: (row: Row) => formatDateTime(row.createdAt)
		},
		{
			key: 'kind',
			header: 'Kind',
			cell: (row: Row) => (row.kind === 'PR_LEFTOVER' ? 'PR leftover' : 'Catalog variance')
		},
		{
			key: 'status',
			header: 'Status',
			cell: (row: Row) => row.status
		},
		{
			key: 'who',
			header: 'PR / Product',
			cell: (row: Row) => {
				if (row.kind === 'PR_LEFTOVER') {
					return `${row.prNumber} — ${row.supplierName}`;
				}
				return row.product ? `${row.product.code} — ${row.product.name}` : '—';
			}
		},
		{
			key: 'amount',
			header: 'Amount',
			cell: (row: Row) => formatCurrency(row.amount)
		},
		{
			key: 'dest',
			header: 'Destination',
			cell: (row: Row) =>
				row.kind === 'PR_LEFTOVER'
					? row.destination === 'KAS_KECIL'
						? 'Kas kecil'
						: 'Bank'
					: '—'
		},
		{
			key: 'actions',
			header: '',
			cell: (row: Row) => {
				if (!canWrite || tab !== 'pending' || row.kind !== 'PR_LEFTOVER') return '—';
				return `<button type="button" class="text-primary-600 hover:underline mr-3" data-approve="${row.id}">Approve</button><button type="button" class="text-danger-600 hover:underline" data-reject="${row.id}">Reject</button>`;
			}
		}
	]);

	function onTableClick(e: MouseEvent) {
		const approve = (e.target as HTMLElement).closest('[data-approve]');
		const reject = (e.target as HTMLElement).closest('[data-reject]');
		if (approve) {
			e.preventDefault();
			decide(approve.getAttribute('data-approve') ?? '', 'approve');
		}
		if (reject) {
			e.preventDefault();
			rejectId = reject.getAttribute('data-reject') ?? '';
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Petty cash', href: '/petty-cash' }, { label: 'Refunds' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Refund requests</h1>
			<p class="text-muted">
				Pending PR leftovers need approval. Posted includes catalog variance (shop cheaper than catalog).
			</p>
		</div>
		<Button href={`/api/petty-cash/refunds?export=1&${query()}`} variant="secondary">
			<Download class="h-4 w-4" />
			Export CSV
		</Button>
	</div>

	<div class="flex gap-2">
		<Button variant={tab === 'pending' ? 'primary' : 'secondary'} onclick={() => { tab = 'pending'; loadPage(1); }}>
			Pending
		</Button>
		<Button variant={tab === 'posted' ? 'primary' : 'secondary'} onclick={() => { tab = 'posted'; loadPage(1); }}>
			Posted
		</Button>
	</div>

	<Card padding="md">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
			<Input label="From" type="date" bind:value={from} />
			<Input label="To" type="date" bind:value={to} />
			<Select
				label="Kind"
				options={[
					{ value: '', label: 'All kinds' },
					{ value: 'PR_LEFTOVER', label: 'PR leftover' },
					{ value: 'CATALOG_VARIANCE', label: 'Catalog variance' }
				]}
				bind:value={kind}
			/>
			<Select
				label="Destination"
				options={[
					{ value: '', label: 'All destinations' },
					{ value: 'KAS_KECIL', label: 'Kas kecil' },
					{ value: 'BANK', label: 'Bank' }
				]}
				bind:value={destination}
			/>
			<Button variant="secondary" onclick={() => loadPage(1)}>Filter</Button>
		</div>
	</Card>

	<div onclick={onTableClick} role="presentation">
		<DataTable columns={columns} rows={queue.rows} />
	</div>
	{#if queue.pagination.total > 0}
		<Pagination {...queue.pagination} onpagechange={loadPage} />
	{/if}
</div>

<Modal open={!!rejectId} title="Reject refund request" onclose={() => (rejectId = '')}>
	<Textarea label="Reason" bind:value={rejectReason} required />
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (rejectId = '')}>Cancel</Button>
		<Button
			variant="danger"
			loading={decideLoading}
			onclick={() => decide(rejectId, 'reject', rejectReason)}
		>
			Reject
		</Button>
	{/snippet}
</Modal>
