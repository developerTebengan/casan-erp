<script lang="ts">
	import { untrack } from 'svelte';
	import { Input, Select, SearchableSelect, Button } from '$lib/components/ui';
	import type { Product, Warehouse } from '$lib/types';

	interface Props {
		products: Product[];
		warehouses?: Warehouse[];
		errors?: Record<string, string>;
		loading?: boolean;
		submitLabel?: string;
		cancelHref?: string;
		onsubmit: (data: Record<string, unknown>) => void;
	}

	let {
		products,
		warehouses = [],
		errors = {},
		loading = false,
		submitLabel = 'Save',
		cancelHref = '/stock',
		onsubmit
	}: Props = $props();

	const defaultWarehouseId = untrack(
		() => warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ''
	);

	let productId = $state(untrack(() => products[0]?.id ?? ''));
	let warehouseId = $state(defaultWarehouseId);
	let type = $state(untrack(() => 'IN'));
	let qty = $state(untrack(() => ''));
	let note = $state(untrack(() => ''));

	const typeOptions = $derived([
		{ value: 'IN', label: 'Stock In (Masuk)' },
		{ value: 'OUT', label: 'Stock Out (Keluar)' },
		{ value: 'ADJUSTMENT', label: 'Adjustment (Penyesuaian)' }
	]);

	const productOptions = $derived(
		products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
	);

	const warehouseOptions = $derived(
		warehouses.map((w) => ({
			value: w.id,
			label: `${w.code} — ${w.name}${w.isDefault ? ' (default)' : ''}`
		}))
	);

	const selectedProduct = $derived(products.find((p) => p.id === productId));

	const qtyLabel = $derived(
		type === 'ADJUSTMENT' ? 'New Stock Quantity' : type === 'IN' ? 'Quantity In' : 'Quantity Out'
	);

	function handleSubmit(e: Event) {
		e.preventDefault();
		const data = {
			productId,
			type,
			qty: Number(qty),
			note: note || null,
			warehouseId: warehouseId || null
		};
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 sm:grid-cols-2">
		<SearchableSelect
			label="Product"
			name="productId"
			options={productOptions}
			bind:value={productId}
			placeholder="Search by code or name..."
			required
			error={errors.productId}
		/>
		{#if warehouseOptions.length > 0}
			<Select
				label="Warehouse"
				name="warehouseId"
				options={warehouseOptions}
				bind:value={warehouseId}
				error={errors.warehouseId}
			/>
		{/if}
		<Select
			label="Transaction Type"
			name="type"
			options={typeOptions}
			bind:value={type}
			required
			error={errors.type}
		/>
		<Input
			label={qtyLabel}
			name="qty"
			type="number"
			min={0}
			bind:value={qty}
			required
			error={errors.qty}
		/>
		<Input label="Note" name="note" bind:value={note} error={errors.note} />
	</div>

	{#if selectedProduct}
		<div class="rounded-lg p-4 text-sm bg-card-secondary">
			<p class="text-muted">Current stock for selected product</p>
			<p class="text-main text-lg font-semibold">
				{selectedProduct.stock.toLocaleString('id-ID')}
				{selectedProduct.unit}
			</p>
		</div>
	{/if}

	<div class="flex justify-end gap-3">
		<Button variant="secondary" href={cancelHref}>Cancel</Button>
		<Button type="submit" variant="primary" {loading}>{submitLabel}</Button>
	</div>
</form>
