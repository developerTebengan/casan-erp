<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Package } from '@lucide/svelte';
	import {
		Card,
		Breadcrumb,
		DataTable,
		EmptyState,
		Button,
		StatusStatTabs
	} from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';
	import type { FulfillmentStatus, ReadyToReceiveRow } from '$lib/types';

	let { data } = $props();

	let ready = $state<ReadyToReceiveRow[]>(untrack(() => data.ready));
	let statusTab = $state('ALL');

	$effect(() => {
		ready = data.ready;
	});

	const counts = $derived({
		ALL: ready.length,
		OPEN: ready.filter((r) => r.fulfillmentStatus === 'OPEN').length,
		PARTIAL: ready.filter((r) => r.fulfillmentStatus === 'PARTIAL').length
	});

	const filtered = $derived(
		statusTab === 'ALL' ? ready : ready.filter((r) => r.fulfillmentStatus === statusTab)
	);

	const tabs = $derived([
		{ id: 'ALL', label: 'All', count: counts.ALL, variant: 'secondary' as const },
		{ id: 'OPEN', label: 'Open', count: counts.OPEN, variant: 'warning' as const },
		{ id: 'PARTIAL', label: 'Partial', count: counts.PARTIAL, variant: 'primary' as const }
	]);

	function fulfillmentBadge(status: FulfillmentStatus) {
		const classes =
			status === 'PARTIAL'
				? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-600'
				: status === 'COMPLETE'
					? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600'
					: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${status}</span>`;
	}

	function actionsCell(row: ReadyToReceiveRow) {
		return `
			<a href="/purchasing/${row.id}" class="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
				Receive
			</a>
		`;
	}

	const columns = [
		{ key: 'prNumber', header: 'PR Number' },
		{
			key: 'supplier',
			header: 'Supplier',
			cell: (r: ReadyToReceiveRow) => r.supplier?.name ?? '-'
		},
		{
			key: 'decisionDeadline',
			header: 'Decision deadline',
			cell: (r: ReadyToReceiveRow) => formatDate(r.decisionDeadline)
		},
		{
			key: 'fulfillment',
			header: 'Fulfillment',
			cell: (r: ReadyToReceiveRow) => fulfillmentBadge(r.fulfillmentStatus)
		},
		{
			key: 'remainingLines',
			header: 'Remaining lines',
			cell: (r: ReadyToReceiveRow) => String(r.remainingLines)
		},
		{
			key: 'qty',
			header: 'Received / Ordered',
			cell: (r: ReadyToReceiveRow) => `${r.receivedQty} / ${r.orderedQty}`
		},
		{ key: 'actions', header: '', cell: actionsCell }
	];

	function handleRowClick(row: ReadyToReceiveRow, e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('a')) return;
		goto(`/purchasing/${row.id}`);
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Receiving' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Receiving</h1>
			<p class="text-muted">Approved purchase requests ready to receive into stock</p>
		</div>
	</div>

	<StatusStatTabs tabs={tabs} active={statusTab} onchange={(id) => (statusTab = id)} />

	{#if ready.length === 0}
		<EmptyState
			title="Nothing to receive"
			description="Approved purchase requests with remaining quantity will appear here."
		>
			<Button href="/purchasing" variant="secondary">
				<Package class="h-4 w-4" />
				View purchasing
			</Button>
		</EmptyState>
	{:else if filtered.length === 0}
		<Card padding="md">
			<p class="text-muted text-center text-sm">No items match this filter.</p>
		</Card>
	{:else}
		<DataTable {columns} rows={filtered} onrowclick={handleRowClick} />
	{/if}
</div>
