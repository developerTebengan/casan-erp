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
				toastStore.success('Purchase order created successfully');
				goto('/purchasing');
			} else {
				const errorData = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to create purchase order');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Purchasing', href: '/purchasing' }, { label: 'Create Purchase Order' }]}
	/>

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">Create Purchase Order</h1>
		<p class="text-muted">Create a new purchase order for your supplier</p>
	</div>

	<Card padding="lg">
		<PurchaseForm
			suppliers={data.suppliers}
			products={data.products}
			onsubmit={handleSubmit}
			{loading}
			{errors}
			submitLabel="Create PO"
		/>
	</Card>
</div>
