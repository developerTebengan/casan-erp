<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Card, Breadcrumb, Button, Badge, DataTable, ConfirmDialog } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatDateTime } from '$lib/utils/format';
	import type { CycleCount } from '$lib/types';

	let { data } = $props();
	const cycleCount = $derived(data.cycleCount as CycleCount);

	let posting = $state(false);
	let confirmPost = $state(false);

	type Line = NonNullable<CycleCount['lines']>[number];

	const columns = [
		{
			key: 'product',
			header: 'Product',
			cell: (l: Line) =>
				l.product ? `${l.product.code} — ${l.product.name}` : l.productId
		},
		{ key: 'systemQty', header: 'System', cell: (l: Line) => String(l.systemQty) },
		{ key: 'countedQty', header: 'Counted', cell: (l: Line) => String(l.countedQty) },
		{
			key: 'variance',
			header: 'Variance',
			cell: (l: Line) => {
				const v = l.variance;
				const color =
					v === 0 ? 'text-muted' : v > 0 ? 'text-success-600' : 'text-danger-600';
				return `<span class="font-medium ${color}">${v > 0 ? '+' : ''}${v}</span>`;
			}
		}
	];

	function statusVariant(status: string) {
		if (status === 'POSTED') return 'success';
		if (status === 'CANCELLED') return 'danger';
		return 'warning';
	}

	async function handlePost() {
		posting = true;
		try {
			const res = await fetch(`/api/cycle-counts/${cycleCount.id}/post`, { method: 'POST' });
			if (res.ok) {
				toastStore.success('Cycle count posted — stock adjusted');
				await invalidateAll();
			} else {
				const err = await res.json().catch(() => ({}));
				toastStore.error(err.errors?.form?.[0] || err.message || 'Failed to post');
			}
		} finally {
			posting = false;
			confirmPost = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[
			{ label: 'Cycle Counts', href: '/cycle-counts' },
			{ label: cycleCount.code }
		]}
	/>

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-main text-2xl font-bold sm:text-3xl">{cycleCount.code}</h1>
				<Badge variant={statusVariant(cycleCount.status)}>{cycleCount.status}</Badge>
			</div>
			<p class="text-muted">
				{cycleCount.warehouse
					? `${cycleCount.warehouse.code} — ${cycleCount.warehouse.name}`
					: 'Warehouse'}
				· Created {formatDateTime(cycleCount.createdAt)}
				{#if cycleCount.postedAt}
					· Posted {formatDateTime(cycleCount.postedAt)}
				{/if}
			</p>
		</div>
		{#if cycleCount.status === 'DRAFT'}
			<Button variant="primary" loading={posting} onclick={() => (confirmPost = true)}>
				Post adjustments
			</Button>
		{/if}
	</div>

	{#if cycleCount.note}
		<Card padding="md">
			<p class="text-muted text-sm">Note</p>
			<p class="text-main">{cycleCount.note}</p>
		</Card>
	{/if}

	<Card padding="lg">
		<h3 class="text-main mb-4 text-lg font-semibold">Count lines</h3>
		<DataTable columns={columns} rows={cycleCount.lines ?? []} />
	</Card>
</div>

<ConfirmDialog
	open={confirmPost}
	title="Post cycle count"
	message="This will create ADJUSTMENT transactions for any variances and mark the count as POSTED. Continue?"
	confirmText="Post"
	loading={posting}
	onconfirm={handlePost}
	oncancel={() => (confirmPost = false)}
/>
