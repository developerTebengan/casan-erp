<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { Card, Breadcrumb, Button, Input, Combobox } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import { catalogTotal, extraSpend, varianceRefund } from '$lib/petty-cash/variance';
	import { nextPaidDefault } from '$lib/petty-cash/paid-default';
	import { Trash2 } from '@lucide/svelte';
	import {
		basketCheckoutAllowed,
		computeBasketTotals,
		type BasketLineDisplay
	} from '$lib/petty-cash/basket';

	let { data } = $props();

	let productId = $state(data.products[0]?.id ?? '');
	let supplierId = $state('');
	let qty = $state('1');
	let paidAmount = $state('');
	let actualUnitPrice = $state('');
	let updateCatalogPrice = $state(false);
	let note = $state('');
	let checkoutLoading = $state(false);
	let errors = $state<Record<string, string>>({});

	let basket = $state<BasketLineDisplay[]>([]);

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
	);
	const supplierOptions = $derived(
		data.suppliers.map((s) => ({ value: s.id, label: s.name }))
	);
	const selected = $derived(data.products.find((p) => p.id === productId));
	const selectedSupplier = $derived(data.suppliers.find((s) => s.id === supplierId));

	const qtyN = $derived(Number(qty) || 0);
	const expected = $derived(selected ? catalogTotal(selected.price, qtyN) : 0);
	const paidN = $derived(Number(paidAmount) || 0);
	const refund = $derived(varianceRefund(expected, paidN));
	const extra = $derived(extraSpend(expected, paidN));

	const basketTotals = $derived(computeBasketTotals(basket, data.balance));
	const canCheckout = $derived(basketCheckoutAllowed(basket, data.balance));

	let previousExpected = $state(0);

	$effect(() => {
		const exp = expected;
		const next = nextPaidDefault(
			untrack(() => paidAmount),
			exp,
			untrack(() => previousExpected)
		);
		if (next !== untrack(() => paidAmount)) paidAmount = next;
		previousExpected = exp;
	});

	function addToBasket(e: Event) {
		e.preventDefault();
		errors = {};

		if (!selected) {
			errors = { productId: 'Product is required' };
			return;
		}
		if (!supplierId) {
			errors = { supplierId: 'Supplier is required' };
			return;
		}
		if (!Number.isFinite(qtyN) || qtyN <= 0) {
			errors = { qty: 'Qty must be greater than 0' };
			return;
		}
		if (!Number.isFinite(paidN) || paidN < 0) {
			errors = { paidAmount: 'Amount paid cannot be negative' };
			return;
		}

		basket = [
			...basket,
			{
				line: {
					productId,
					supplierId,
					qty: qtyN,
					paidAmount: paidN,
					actualUnitPrice: actualUnitPrice === '' ? null : Number(actualUnitPrice),
					updateCatalogPrice,
					note: note || null
				},
				catalogUnitPrice: selected.price
			}
		];

		// Reset form for fast next add.
		qty = '1';
		paidAmount = '';
		actualUnitPrice = '';
		updateCatalogPrice = false;
		note = '';
	}

	function removeLine(index: number) {
		basket = basket.filter((_, i) => i !== index);
	}

	function updateLine(index: number, patch: Partial<BasketLineDisplay['line']>) {
		basket = basket.map((item, i) => {
			if (i !== index) return item;
			return { ...item, line: { ...item.line, ...patch } };
		});
	}

	async function checkoutBasket() {
		if (!basket.length) return;
		checkoutLoading = true;
		try {
			const res = await fetch('/api/stock/petty-cash/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: basket.map((b) => ({
						productId: b.line.productId,
						supplierId: b.line.supplierId,
						qty: b.line.qty,
						paidAmount: b.line.paidAmount,
						actualUnitPrice: b.line.actualUnitPrice,
						updateCatalogPrice: b.line.updateCatalogPrice,
						note: b.line.note
					}))
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				const msg =
					err.errors?.form?.[0] ||
					err.errors?.paidAmount?.[0] ||
					err.message ||
					'Failed to checkout';
				toastStore.error(msg);
				return;
			}

			toastStore.success('Stock in recorded with petty cash');
			basket = [];
			goto('/stock');
		} finally {
			checkoutLoading = false;
		}
	}

	function findProduct(productId: string) {
		return data.products.find((p) => p.id === productId);
	}

	function findSupplier(supplierId: string) {
		return data.suppliers.find((s) => s.id === supplierId);
	}

	function productLabel(productId: string) {
		const p = findProduct(productId);
		return p ? `${p.code} — ${p.name}` : productId;
	}

	function supplierLabel(supplierId: string) {
		const s = findSupplier(supplierId);
		return s ? s.name : supplierId;
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
			Petty cash now {formatCurrency(data.balance)} · Basket paid{' '}
			{formatCurrency(basketTotals.paidTotal)} · After checkout{' '}
			<span class={basketTotals.afterCheckout < 0 ? 'text-warning-700 dark:text-warning-500' : ''}>
				{formatCurrency(basketTotals.afterCheckout)}
			</span>
		</p>
	</div>

	<Card padding="lg">
		<form onsubmit={addToBasket} class="space-y-6">
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
				<Button type="submit" variant="primary">Add to basket</Button>
			</div>
		</form>
		<div class="space-y-4 pt-6">
			{#if basket.length === 0}
				<p class="text-muted text-sm">Basket is empty. Add items above, then checkout.</p>
			{:else}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<Button variant="secondary" onclick={() => (basket = [])}>Clear basket</Button>
					<div class="text-muted text-sm">
						Lines {basket.length} · Refund preview {formatCurrency(basketTotals.refundTotal)} · Extra preview{' '}
						{formatCurrency(basketTotals.extraTotal)}
					</div>
				</div>

				<div class="space-y-3">
					{#each basket as b, index (index)}
						<div class="border-theme rounded-lg border p-4">
							<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="text-main font-semibold">{productLabel(b.line.productId)}</p>
									<p class="text-muted text-sm">{supplierLabel(b.line.supplierId)}</p>
									<p class="text-muted text-xs">
										Catalog unit {formatCurrency(b.catalogUnitPrice)}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<Button variant="ghost" onclick={() => removeLine(index)}>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</div>

							<div class="mt-4 grid gap-4 sm:grid-cols-3">
								<Input
									label="Qty"
									type="number"
									min="1"
									value={String(b.line.qty)}
									oninput={(e) => {
										const v = Number((e.target as HTMLInputElement).value);
										updateLine(index, { qty: Number.isFinite(v) && v > 0 ? v : b.line.qty });
									}}
								/>
								<Input
									label="Paid (total)"
									type="number"
									min="0"
									value={String(b.line.paidAmount)}
									oninput={(e) => {
										const v = Number((e.target as HTMLInputElement).value);
										updateLine(index, { paidAmount: Number.isFinite(v) && v >= 0 ? v : b.line.paidAmount });
									}}
								/>
								<div class="space-y-2">
									<div class="text-muted text-sm">
										Catalog total {formatCurrency(catalogTotal(b.catalogUnitPrice, b.line.qty))}
									</div>
									{#if varianceRefund(
										catalogTotal(b.catalogUnitPrice, b.line.qty),
										b.line.paidAmount
									) > 0}
										<p class="text-success-700 dark:text-success-500 text-sm">
											Refund{' '}
											{formatCurrency(
												varianceRefund(
													catalogTotal(b.catalogUnitPrice, b.line.qty),
													b.line.paidAmount
												)
											)}
										</p>
									{:else}
										<p class="text-muted text-sm">Refund —</p>
									{/if}
									{#if extraSpend(
										catalogTotal(b.catalogUnitPrice, b.line.qty),
										b.line.paidAmount
									) > 0}
										<p class="text-warning-700 dark:text-warning-500 text-sm">
											Extra{' '}
											{formatCurrency(
												extraSpend(
													catalogTotal(b.catalogUnitPrice, b.line.qty),
													b.line.paidAmount
												)
											)}
										</p>
									{:else}
										<p class="text-muted text-sm">Extra —</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="bg-card-secondary space-y-1 rounded-lg p-4 text-sm">
					<p>Catalog total: {formatCurrency(basketTotals.catalogTotal)}</p>
					<p>Basket paid: {formatCurrency(basketTotals.paidTotal)}</p>
					{#if basketTotals.refundTotal > 0}
						<p class="text-success-700 dark:text-success-500">
							Refund preview: {formatCurrency(basketTotals.refundTotal)}
						</p>
					{/if}
					{#if basketTotals.extraTotal > 0}
						<p class="text-warning-700 dark:text-warning-500">
							Extra preview: {formatCurrency(basketTotals.extraTotal)}
						</p>
					{/if}
				</div>

				<div class="flex gap-3">
					<Button
						type="button"
						variant="primary"
						loading={checkoutLoading}
						disabled={!canCheckout || basketTotals.afterCheckout < 0}
						onclick={checkoutBasket}
					>
						Checkout into stock
					</Button>
				</div>
			{/if}
		</div>
	</Card>
</div>
