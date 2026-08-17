<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Breadcrumb } from '$lib/components/ui';
	import PurchaseForm from '$lib/components/PurchaseForm.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	let { data } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	async function handleSubmit(formData: Record<string, unknown>) {
		loading = true;
		errors = {};
		try {
			const res = await fetch('/api/purchases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (res.ok) {
				toastStore.success('Purchasing request created successfully');
				goto('/purchasing');
			} else {
				const errorData = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to create purchasing request');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Purchasing Request', href: '/purchasing' }, { label: 'Create Purchasing Request' }]}
	/>

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">Create Purchasing Request</h1>
		<p class="text-muted">Create a purchase request — one PR can cover several suppliers</p>
	</div>

	<Card padding="lg">
		{#if data.fromLowStock}
			<div
				class="mb-6 rounded-lg bg-warning-50 p-4 text-sm text-warning-800 dark:bg-warning-900/20 dark:text-warning-400"
			>
				Pre-filled from low-stock products. Review quantities and assign approvers before submitting.
			</div>
		{/if}
		<PurchaseForm
			purchase={data.initialPurchase}
			suppliers={data.suppliers}
			products={data.products}
			users={data.users}
			onsubmit={handleSubmit}
			{loading}
			{errors}
			submitLabel="Create PR"
		/>
	</Card>
</div>
