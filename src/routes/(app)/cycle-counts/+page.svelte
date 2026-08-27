<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus } from '@lucide/svelte';
	import {
		Card,
		Button,
		Breadcrumb,
		DataTable,
		EmptyState
	} from '$lib/components/ui';
	import { formatDateTime } from '$lib/utils/format';

	let { data } = $props();

	type Row = {
		id: string;
		code: string;
		status: string;
		createdAt: string;
		postedAt?: string | null;
		warehouse?: { code: string; name: string };
		lineCount?: number;
	};

	let cycleCounts = $state<Row[]>(untrack(() => data.cycleCounts as Row[]));

	$effect(() => {
		cycleCounts = data.cycleCounts as Row[];
	});

	function statusBadge(status: string) {
		const variant =
			status === 'POSTED'
				? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-500'
				: status === 'CANCELLED'
					? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-500'
					: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-600';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variant}">${status}</span>`;
	}

	const columns = [
		{ key: 'code', header: 'Code' },
		{
			key: 'warehouse',
			header: 'Warehouse',
			cell: (r: Row) => r.warehouse ? `${r.warehouse.code} — ${r.warehouse.name}` : '-'
		},
		{ key: 'status', header: 'Status', cell: (r: Row) => statusBadge(r.status) },
		{
			key: 'lines',
			header: 'Lines',
			cell: (r: Row) => String(r.lineCount ?? 0)
		},
		{
			key: 'createdAt',
			header: 'Created',
			cell: (r: Row) => formatDateTime(r.createdAt)
		}
	];
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Cycle Counts' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Cycle Counts</h1>
			<p class="text-muted">Physical inventory counts and adjustments</p>
		</div>
		<Button variant="primary" href="/cycle-counts/new">
			<Plus class="h-4 w-4" />
			New Cycle Count
		</Button>
	</div>

	{#if cycleCounts.length === 0}
		<EmptyState
			title="No cycle counts"
			description="Create a draft count to compare system vs physical qty."
		>
			<Button variant="primary" href="/cycle-counts/new">
				<Plus class="h-4 w-4" />
				New Cycle Count
			</Button>
		</EmptyState>
	{:else}
		<DataTable
			{columns}
			rows={cycleCounts}
			onrowclick={(row) => goto(`/cycle-counts/${row.id}`)}
		/>
	{/if}
</div>
