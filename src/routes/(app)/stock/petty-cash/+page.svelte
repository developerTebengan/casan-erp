<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { Card, Breadcrumb, Button, Input, Combobox } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import { catalogTotal, extraSpend, varianceRefund } from '$lib/petty-cash/variance';
	import { nextPaidDefault } from '$lib/petty-cash/paid-default';

	let { data } = $props();

	let productId = $state(data.products[0]?.id ?? '');
	let supplierId = $state('');
	let qty = $state('1');
	let paidAmount = $state('');
	let actualUnitPrice = $state('');
	let updateCatalogPrice = $state(false);
	let note = $state('');
	let loading = $state(false);
	let errors = $state<Record<string, string>>({});

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
	);
	const supplierOptions = $derived(
		data.suppliers.map((s) => ({ value: s.id, label: s.name }))
	);
	const selected = $derived(data.products.find((p) => p.id === productId));
	const qtyN = $derived(Number(qty) || 0);
	const expected = $derived(selected ? catalogTotal(selected.price, qtyN) : 0);
	const paidN = $derived(Number(paidAmount) || 0);
	const refund = $derived(varianceRefund(expected, paidN));
	const extra = $derived(extraSpend(expected, paidN));
	let previousExpected = $state(0);

	$effect(() => {
		const exp = expected;
		const next = nextPaidDefault(untrack(() => paidAmount), exp, untrack(() => previousExpected));
		if (next !== untrack(() => paidAmount)) paidAmount = next;
		previousExpected = exp;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		errors = {};
		try {
			const res = await fetch('/api/stock/petty-cash', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					productId,
					supplierId,
					qty: qtyN,
					paidAmount: paidN,
					actualUnitPrice: actualUnitPrice === '' ? null : Number(actualUnitPrice),
					updateCatalogPrice,
					note: note || null
				})
			});
			if (res.ok) {
				toastStore.success('Stock in recorded with petty cash');
				goto('/stock');
			} else {
				const err = await res.json().catch(() => ({}));
				errors = Object.fromEntries(
					Object.entries(err.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(err.errors?.paidAmount?.[0] || err.message || 'Failed to record buy');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[
			{ label: 'Petty cash', href: '/petty-cash' },
			{ label: 'Buy with petty cash' }
		]}
	/>

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">Buy with petty cash</h1>
		<p class="text-muted">
			Balance {formatCurrency(data.balance)}. Amount paid starts at catalog total — change it if
			the shop price is different. Unused catalog budget is listed as a refund.
		</p>
	</div>

	<Card padding="lg">
		<form onsubmit={handleSubmit} class="space-y-6">
			<div class="grid gap-6 sm:grid-cols-2">
				<div class="space-y-3">
					<Combobox
						label="Product"
						options={productOptions}
						bind:value={productId}
						required
						placeholder="Search product"
						error={errors.productId}
					/>
					{#if selected}
						<div class="bg-card-secondary rounded-lg p-4 text-sm">
							<p class="text-muted">Product detail</p>
							<p class="text-main font-semibold">{selected.code} — {selected.name}</p>
							<p>Stock {selected.stock.toLocaleString('id-ID')} {selected.unit}</p>
							<p>Catalog unit {formatCurrency(selected.price)}</p>
						</div>
					{/if}
				</div>
				<Combobox
					label="Supplier"
					options={supplierOptions}
					bind:value={supplierId}
					required
					placeholder="Search supplier"
					error={errors.supplierId}
				/>
				<Input label="Qty" type="number" min="1" bind:value={qty} required error={errors.qty} />
				<Input
					label="Amount paid"
					type="number"
					min="0"
					bind:value={paidAmount}
					required
					error={errors.paidAmount}
					placeholder={expected ? String(expected) : ''}
				/>
				<Input
					label="Actual unit price (optional)"
					type="number"
					min="0"
					bind:value={actualUnitPrice}
					error={errors.actualUnitPrice}
					placeholder={selected ? String(selected.price) : ''}
				/>
			</div>

			<label class="text-main flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={updateCatalogPrice} />
				Update catalog unit price to actual unit price
			</label>

			<Input label="Note" bind:value={note} placeholder="Shop / receipt no..." />

			<div class="bg-card-secondary space-y-1 rounded-lg p-4 text-sm">
				<p>Catalog total: {formatCurrency(expected)}</p>
				{#if refund > 0}
					<p class="text-success-700 dark:text-success-500">
						Refund to petty cash (unused vs catalog): {formatCurrency(refund)}
					</p>
				{/if}
				{#if extra > 0}
					<p class="text-warning-700 dark:text-warning-500">
						Extra spend from petty cash: {formatCurrency(extra)}
					</p>
				{/if}
			</div>

			<div class="flex gap-3">
				<Button variant="secondary" href="/petty-cash">Cancel</Button>
				<Button type="submit" variant="primary" {loading}>Receive into stock</Button>
			</div>
		</form>
	</Card>
</div>
