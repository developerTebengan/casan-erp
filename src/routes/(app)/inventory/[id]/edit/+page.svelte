<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Breadcrumb } from '$lib/components/ui';
	import ProductForm from '$lib/components/ProductForm.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	let { data } = $props();

	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	async function handleSubmit(formData: Record<string, unknown>) {
		loading = true;
		errors = {};
		try {
			const res = await fetch(`/api/products/${data.product.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (res.ok) {
				toastStore.success('Product updated successfully');
				goto(`/inventory/${data.product.id}`);
			} else {
				const errorData = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to update product');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[
			{ label: 'Inventory', href: '/inventory' },
			{ label: data.product.name, href: `/inventory/${data.product.id}` },
			{ label: 'Edit' }
		]}
	/>

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">Edit Product</h1>
		<p class="text-muted">Update product information</p>
	</div>

	<Card padding="lg">
		<ProductForm
			product={data.product}
			categories={data.categories}
			onsubmit={handleSubmit}
			{loading}
			{errors}
			submitLabel="Update Product"
		/>
	</Card>
</div>
