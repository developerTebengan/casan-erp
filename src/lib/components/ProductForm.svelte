<script lang="ts">
	import { untrack } from 'svelte';
	import { Input, Select, Button } from '$lib/components/ui';
	import { formatNumber, parseIdNumber } from '$lib/utils/format';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Product, Category } from '$lib/types';

	interface Props {
		product?: Partial<Product>;
		categories: Category[];
		errors?: Record<string, string>;
		loading?: boolean;
		submitLabel?: string;
		onsubmit: (data: Record<string, unknown>) => void;
	}

	let {
		product,
		categories,
		errors = {},
		loading = false,
		submitLabel = 'Save',
		onsubmit
	}: Props = $props();

	const isEdit = $derived(!!product?.id);

	let code = $state(untrack(() => product?.code ?? ''));
	let name = $state(untrack(() => product?.name ?? ''));
	let categoryId = $state(untrack(() => product?.categoryId ?? ''));
	let unit = $state(untrack(() => product?.unit ?? 'PCS'));
	let stock = $state(untrack(() => product?.stock ?? 0));
	let minimumStock = $state(untrack(() => product?.minimumStock ?? 0));
	let price = $state(untrack(() => product?.price ?? 0));
	let priceInput = $state(untrack(() => formatNumber(Number(product?.price ?? 0))));
	let status = $state(untrack(() => product?.status ?? 'ACTIVE'));
	let imageUrl = $state(untrack(() => product?.imageUrl ?? ''));
	let uploading = $state(false);

	const categoryOptions = $derived(categories.map((c) => ({ value: c.id, label: c.name })));
	const statusOptions = $derived([
		{ value: 'ACTIVE', label: 'Active' },
		{ value: 'INACTIVE', label: 'Inactive' }
	]);

	async function handleImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;
		try {
			const body = new FormData();
			body.set('file', file);
			const res = await fetch('/api/uploads/product-image', { method: 'POST', body });
			if (res.ok) {
				const data = await res.json();
				imageUrl = data.url;
				toastStore.success('Photo uploaded');
			} else {
				const err = await res.json().catch(() => ({}));
				toastStore.error(err.message || 'Upload failed');
			}
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		const data = {
			code: isEdit ? code : undefined,
			name,
			categoryId,
			unit,
			stock: Number(stock),
			minimumStock: Number(minimumStock),
			price: Number(price),
			imageUrl: imageUrl || null,
			status
		};
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 sm:grid-cols-2">
		{#if isEdit}
			<Input
				label="Product Code"
				name="code"
				bind:value={code}
				required
				error={errors.code}
			/>
		{:else}
			<div>
				<p class="text-main mb-1.5 text-sm font-medium">Product Code</p>
				<div
					class="border-theme bg-slate-50 text-muted rounded-lg border px-4 py-2.5 text-sm dark:bg-slate-800/50"
				>
					Auto-generated on save (e.g. ELE-202607-0001)
				</div>
			</div>
		{/if}
		<Input label="Product Name" name="name" bind:value={name} required error={errors.name} />
		<Select
			label="Category (product type)"
			name="categoryId"
			options={categoryOptions}
			bind:value={categoryId}
			required
			error={errors.categoryId}
		/>
		<Input label="Unit" name="unit" bind:value={unit} required error={errors.unit} />
		<Input
			label={isEdit ? 'Current Stock (read-only)' : 'Initial Stock'}
			name="stock"
			type="number"
			bind:value={stock}
			required={!isEdit}
			disabled={isEdit}
			error={errors.stock}
		/>
		{#if isEdit}
			<p class="text-muted -mt-4 text-xs sm:col-span-2">
				Stock changes only via Stock Movement or Goods Receipt on an approved PR.
			</p>
		{/if}
		<Input
			label="Minimum Stock"
			name="minimumStock"
			type="number"
			bind:value={minimumStock}
			required
			error={errors.minimumStock}
		/>
		<Input
			label="Price"
			name="price"
			type="text"
			bind:value={priceInput}
			oninput={(e) => {
				const raw = (e.target as HTMLInputElement).value;
				price = parseIdNumber(raw);
			}}
			onblur={() => {
				priceInput = formatNumber(price);
			}}
			required
			error={errors.price}
		/>
		<Select
			label="Status"
			name="status"
			options={statusOptions}
			bind:value={status}
			required
			error={errors.status}
		/>
	</div>

	<div class="space-y-3">
		<p class="text-main text-sm font-medium">Product photo</p>
		{#if imageUrl}
			<img
				src={imageUrl}
				alt={name || 'Product'}
				class="border-theme h-32 w-32 rounded-lg border object-cover"
			/>
		{/if}
		<input
			type="file"
			accept="image/*"
			class="text-main block w-full text-sm"
			onchange={handleImageChange}
			disabled={uploading || loading}
		/>
		<p class="text-muted text-xs">JPG, PNG, or WebP up to 3MB.</p>
	</div>

	<div class="flex justify-end gap-3">
		<Button variant="secondary" href="/inventory">Cancel</Button>
		<Button type="submit" variant="primary" loading={loading || uploading}>{submitLabel}</Button>
	</div>
</form>
