<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ArrowLeft, RotateCcw, Package, Link2 } from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Button, Textarea, Modal } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatNumber } from '$lib/utils/format';

	let { data } = $props();
	const tx = $derived(data.tx);

	let reverseOpen = $state(false);
	let reason = $state('');
	let loading = $state(false);

	const typeVariant = $derived(
		tx.type === 'IN' ? 'success' : tx.type === 'OUT' ? 'danger' : 'warning'
	);

	async function handleReverse() {
		loading = true;
		try {
			const res = await fetch(`/api/stock/${tx.id}/reverse`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason })
			});
			if (res.ok) {
				toastStore.success('Transaction reversed — stock updated');
				reverseOpen = false;
				reason = '';
				await invalidateAll();
			} else {
				const err = await res.json().catch(() => ({}));
				toastStore.error(err.errors?.form?.[0] || err.message || 'Failed to reverse');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Stock Movement', href: '/stock' }, { label: 'Transaction detail' }]}
	/>

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Stock Transaction</h1>
			<p class="text-muted">{formatDateTime(tx.createdAt)}</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<Button variant="secondary" href="/stock">
				<ArrowLeft class="h-4 w-4" />
				Back
			</Button>
			{#if !data.alreadyReversed && !data.isReversal}
				<Button variant="danger" onclick={() => (reverseOpen = true)}>
					<RotateCcw class="h-4 w-4" />
					Reverse
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card class="lg:col-span-2" padding="lg">
			<div class="mb-6 flex items-start gap-4">
				<div
					class="rounded-2xl bg-primary-100 p-4 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
				>
					<Package class="h-8 w-8" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="mb-2 flex flex-wrap items-center gap-2">
						<Badge variant={typeVariant}>{tx.type}</Badge>
						<Badge variant="secondary">{tx.source}</Badge>
						{#if data.alreadyReversed}
							<Badge variant="warning">Reversed</Badge>
						{/if}
						{#if data.isReversal}
							<Badge variant="warning">Reversal</Badge>
						{/if}
					</div>
					{#if tx.product}
						<a
							href="/inventory/{tx.product.id}"
							class="text-main text-xl font-semibold hover:text-primary-600"
						>
							{tx.product.code} — {tx.product.name}
						</a>
						<p class="text-muted text-sm">{tx.product.unit}</p>
					{/if}
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<div class="bg-card-secondary rounded-lg p-4">
					<p class="text-muted text-sm">Quantity</p>
					<p class="text-main text-xl font-bold">{formatNumber(tx.qty)}</p>
				</div>
				<div class="bg-card-secondary rounded-lg p-4">
					<p class="text-muted text-sm">Stock before</p>
					<p class="text-main text-xl font-bold">{formatNumber(tx.stockBefore)}</p>
				</div>
				<div class="bg-card-secondary rounded-lg p-4">
					<p class="text-muted text-sm">Stock after</p>
					<p class="text-main text-xl font-bold">{formatNumber(tx.stockAfter)}</p>
				</div>
			</div>

			{#if tx.note}
				<div class="bg-card-secondary mt-4 rounded-lg p-4">
					<p class="text-muted text-sm">Note</p>
					<p class="text-main font-medium">{tx.note}</p>
				</div>
			{/if}
		</Card>

		<Card padding="lg">
			<h3 class="text-main mb-4 text-lg font-semibold">References</h3>
			<div class="space-y-4 text-sm">
				{#if data.purchase}
					<a
						href="/purchasing/{data.purchase.id}"
						class="border-theme hover:bg-card-secondary flex items-center gap-3 rounded-lg border p-3 transition"
					>
						<Link2 class="h-4 w-4 text-primary-600" />
						<div>
							<p class="text-muted">Purchase request</p>
							<p class="text-main font-semibold">{data.purchase.prNumber}</p>
						</div>
					</a>
				{:else if tx.referenceId}
					<div>
						<p class="text-muted">Reference ID</p>
						<p class="text-main break-all font-mono text-xs">{tx.referenceId}</p>
					</div>
				{:else}
					<p class="text-muted">No linked purchase request</p>
				{/if}

				{#if tx.product}
					<a href="/inventory/{tx.product.id}" class="text-primary-600 text-sm hover:underline">
						Open product →
					</a>
					<a
						href="/stock/new"
						class="text-primary-600 mt-2 block text-sm hover:underline"
					>
						Adjust stock →
					</a>
				{/if}
			</div>
		</Card>
	</div>
</div>

<Modal open={reverseOpen} title="Reverse stock transaction" onclose={() => (reverseOpen = false)}>
	<div class="space-y-4">
		<p class="text-muted text-sm">
			This creates an opposite movement to undo the stock effect. The original row stays for audit
			and is marked as reversed.
		</p>
		<Textarea
			label="Reason (optional)"
			placeholder="Why reverse this movement?"
			bind:value={reason}
			disabled={loading}
		/>
		<div class="flex justify-end gap-3">
			<Button variant="secondary" onclick={() => (reverseOpen = false)} disabled={loading}>
				Cancel
			</Button>
			<Button variant="danger" {loading} onclick={handleReverse}>
				<RotateCcw class="h-4 w-4" />
				Confirm reverse
			</Button>
		</div>
	</div>
</Modal>
