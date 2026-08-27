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
			const res = await fetch(`/api/purchases/${data.purchase.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (res.ok) {
				toastStore.success('Purchasing request updated successfully');
				goto(`/purchasing/${data.purchase.id}`);
			} else {
				const errorData = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to update purchasing request');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[
			{ label: 'Purchasing Request', href: '/purchasing' },
			{ label: data.purchase.prNumber, href: `/purchasing/${data.purchase.id}` },
			{ label: 'Edit' }
		]}
	/>

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">Edit Purchasing Request</h1>
		<p class="text-muted">
			{#if data.purchase.approvalStatus === 'REJECTED'}
				Revise this rejected request. Saving will reset approvals to pending.
			{:else}
				Update this pending purchasing request
			{/if}
		</p>
	</div>

	<Card padding="lg">
		<PurchaseForm
			purchase={data.purchase}
			suppliers={data.suppliers}
			products={data.products}
			users={data.users}
			onsubmit={handleSubmit}
			{loading}
			{errors}
			submitLabel="Update PR"
		/>
	</Card>
</div>
