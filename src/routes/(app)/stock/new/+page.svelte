<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Breadcrumb } from '$lib/components/ui';
	import StockTransactionForm from '$lib/components/StockTransactionForm.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	let { data } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	async function handleSubmit(formData: Record<string, unknown>) {
		loading = true;
		errors = {};
		try {
			const res = await fetch('/api/stock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (res.ok) {
				toastStore.success('Stock transaction recorded successfully');
				goto('/stock');
			} else {
				const errorData = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to record transaction');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Stock Movement', href: '/stock' }, { label: 'New Transaction' }]} />

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">New Stock Transaction</h1>
		<p class="text-muted">Record stock in, stock out, or an adjustment</p>
	</div>

	<Card padding="lg">
		<StockTransactionForm
			products={data.products}
			onsubmit={handleSubmit}
			{loading}
			{errors}
			submitLabel="Record Transaction"
		/>
	</Card>
</div>
