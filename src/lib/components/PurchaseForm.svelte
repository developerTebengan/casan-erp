<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus, Trash2 } from '@lucide/svelte';
	import { Input, Select, Button } from '$lib/components/ui';
	import { formatCurrency } from '$lib/utils/format';
	import type { Product, Supplier, Purchase, PurchaseStatus } from '$lib/types';

	interface Props {
		purchase?: Partial<Purchase>;
		suppliers: Supplier[];
		products: Product[];
		errors?: Record<string, string>;
		loading?: boolean;
		submitLabel?: string;
		onsubmit: (data: Record<string, unknown>) => void;
	}

	let {
		purchase,
		suppliers,
		products,
		errors = {},
		loading = false,
		submitLabel = 'Save',
		onsubmit
	}: Props = $props();

	let poNumber = $state(untrack(() => purchase?.poNumber ?? generatePONumber()));
	let supplierId = $state(untrack(() => purchase?.supplierId ?? ''));
	let purchaseDate = $state(
		untrack(() =>
			formatDateForInput(purchase?.purchaseDate ? new Date(purchase.purchaseDate) : new Date())
		)
	);
	let status = $state<PurchaseStatus>(untrack(() => purchase?.status ?? 'DRAFT'));
	let items = $state(
		untrack(
			() =>
				purchase?.items?.map((item) => ({
					productId: item.productId,
					qty: item.qty,
					price: item.price
				})) ?? [{ productId: '', qty: 1, price: 0 }]
		)
	);

	const supplierOptions = $derived(suppliers.map((s) => ({ value: s.id, label: s.name })));
	const productOptions = $derived(
		products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))
	);
	const statusOptions = $derived([
		{ value: 'DRAFT', label: 'Draft' },
		{ value: 'ORDERED', label: 'Ordered' },
		{ value: 'RECEIVED', label: 'Received' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	]);

	const total = $derived(
		items.reduce((sum, item) => {
			const qty = Number(item.qty) || 0;
			const price = Number(item.price) || 0;
			return sum + qty * price;
		}, 0)
	);

	function generatePONumber() {
		const now = new Date();
		return `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
	}

	function formatDateForInput(date: Date) {
		return date.toISOString().split('T')[0];
	}

	function addItem() {
		items = [...items, { productId: '', qty: 1, price: 0 }];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
	}

	function updatePrice(index: number) {
		const item = items[index];
		const product = products.find((p) => p.id === item.productId);
		if (product && !item.price) {
			items[index] = { ...item, price: product.purchasePrice };
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		const data = {
			poNumber,
			supplierId,
			purchaseDate,
			status,
			items: items
				.filter((item) => item.productId)
				.map((item) => ({
					productId: item.productId,
					qty: Number(item.qty),
					price: Number(item.price)
				}))
		};
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<Input
			label="PO Number"
			name="poNumber"
			bind:value={poNumber}
			required
			error={errors.poNumber}
		/>
		<Select
			label="Supplier"
			name="supplierId"
			options={supplierOptions}
			bind:value={supplierId}
			required
			error={errors.supplierId}
		/>
		<Input
			label="Purchase Date"
			name="purchaseDate"
			type="date"
			bind:value={purchaseDate}
			required
			error={errors.purchaseDate}
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

	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h3 class="text-main text-lg font-semibold">Items</h3>
			<Button type="button" variant="secondary" size="sm" onclick={addItem}>
				<Plus class="h-4 w-4" />
				Add Item
			</Button>
		</div>

		{#if errors.items}
			<p class="text-sm text-danger-500">{errors.items}</p>
		{/if}

		<div class="space-y-3">
			{#each items as item, index}
				<div
					class="border-theme grid gap-3 rounded-lg border bg-slate-50 p-4 sm:grid-cols-12 sm:items-end dark:bg-slate-800/30"
				>
					<div class="sm:col-span-5">
						<Select
							label="Product"
							options={productOptions}
							bind:value={item.productId}
							onchange={() => updatePrice(index)}
							required
						/>
					</div>
					<div class="sm:col-span-2">
						<Input label="Qty" type="number" min="1" bind:value={item.qty} required />
					</div>
					<div class="sm:col-span-3">
						<Input label="Price" type="number" min="0" bind:value={item.price} required />
					</div>
					<div class="sm:col-span-1">
						<p class="text-main mb-1.5 text-sm font-medium">Subtotal</p>
						<p class="text-main text-sm font-semibold">{formatCurrency(item.qty * item.price)}</p>
					</div>
					<div class="sm:col-span-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => removeItem(index)}
							class="text-danger-500 hover:text-danger-600"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="border-theme flex items-center justify-between border-t pt-6">
		<div>
			<p class="text-muted text-sm">Total Amount</p>
			<p class="text-2xl font-bold text-primary-600">{formatCurrency(total)}</p>
		</div>
		<div class="flex gap-3">
			<Button variant="secondary" href="/purchasing">Cancel</Button>
			<Button type="submit" variant="primary" {loading}>{submitLabel}</Button>
		</div>
	</div>
</form>
