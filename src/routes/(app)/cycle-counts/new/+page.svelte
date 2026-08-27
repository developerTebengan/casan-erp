<script lang="ts">
	import { goto } from '$app/navigation';
	import { Plus, Trash2 } from '@lucide/svelte';
	import { Card, Breadcrumb, Button, Input, Select, Textarea } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Product, Warehouse } from '$lib/types';

	let { data } = $props();

	type ProductRow = Product & { warehouseQty?: number };

	let warehouses = $state<Warehouse[]>(data.warehouses);
	let products = $state<ProductRow[]>(data.products);
	let warehouseId = $state(data.defaultWarehouseId);
	let note = $state('');
	let loading = $state(false);

	type Line = { productId: string; systemQty: number; countedQty: string };
	let lines = $state<Line[]>([
		{
			productId: data.products[0]?.id ?? '',
			systemQty: data.products[0]?.warehouseQty ?? data.products[0]?.stock ?? 0,
			countedQty: String(data.products[0]?.warehouseQty ?? data.products[0]?.stock ?? 0)
		}
	]);

	const warehouseOptions = $derived(
		warehouses.map((w) => ({
			value: w.id,
			label: `${w.code} — ${w.name}${w.isDefault ? ' (default)' : ''}`
		}))
	);

	const productOptions = $derived(
		products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))
	);

	function systemQtyFor(productId: string) {
		const p = products.find((x) => x.id === productId);
		return p?.warehouseQty ?? p?.stock ?? 0;
	}

	function addLine() {
		const unused = products.find((p) => !lines.some((l) => l.productId === p.id));
		const productId = unused?.id ?? products[0]?.id ?? '';
		const systemQty = systemQtyFor(productId);
		lines = [...lines, { productId, systemQty, countedQty: String(systemQty) }];
	}

	function removeLine(index: number) {
		lines = lines.filter((_, i) => i !== index);
	}

	function onProductChange(index: number, productId: string) {
		const systemQty = systemQtyFor(productId);
		lines = lines.map((l, i) =>
			i === index ? { productId, systemQty, countedQty: String(systemQty) } : l
		);
	}

	async function handleSubmit() {
		if (lines.length === 0) {
			toastStore.error('Add at least one line');
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/cycle-counts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					warehouseId,
					note: note || null,
					lines: lines.map((l) => ({
						productId: l.productId,
						systemQty: l.systemQty,
						countedQty: Number(l.countedQty)
					}))
				})
			});
			if (res.ok) {
				const created = await res.json();
				toastStore.success('Cycle count draft created');
				goto(`/cycle-counts/${created.id}`);
			} else {
				const err = await res.json().catch(() => ({}));
				toastStore.error(err.errors?.form?.[0] || err.message || 'Failed to create');
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Cycle Counts', href: '/cycle-counts' }, { label: 'New' }]}
	/>

	<div>
		<h1 class="text-main text-2xl font-bold sm:text-3xl">New Cycle Count</h1>
		<p class="text-muted">Create a draft physical count</p>
	</div>

	<Card padding="lg">
		<div class="space-y-6">
			<div class="grid gap-4 sm:grid-cols-2">
				<Select
					label="Warehouse"
					options={warehouseOptions}
					bind:value={warehouseId}
					required
				/>
				<Textarea label="Note (optional)" bind:value={note} />
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-main font-semibold">Lines</h3>
					<Button variant="secondary" size="sm" onclick={addLine}>
						<Plus class="h-4 w-4" />
						Add line
					</Button>
				</div>

				{#each lines as line, index (index)}
					<div class="border-theme grid gap-3 rounded-lg border p-3 sm:grid-cols-4">
						<Select
							label="Product"
							options={productOptions}
							value={line.productId}
							onchange={(e) =>
								onProductChange(index, (e.target as HTMLSelectElement).value)}
						/>
						<Input label="System qty" value={String(line.systemQty)} disabled />
						<Input
							label="Counted qty"
							type="number"
							min={0}
							value={line.countedQty}
							oninput={(e) => {
								const v = (e.target as HTMLInputElement).value;
								lines = lines.map((l, i) => (i === index ? { ...l, countedQty: v } : l));
							}}
						/>
						<div class="flex items-end">
							<Button
								variant="secondary"
								size="sm"
								onclick={() => removeLine(index)}
								disabled={lines.length <= 1}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>

			<div class="flex justify-end gap-3">
				<Button variant="secondary" href="/cycle-counts">Cancel</Button>
				<Button variant="primary" {loading} onclick={handleSubmit}>Save Draft</Button>
			</div>
		</div>
	</Card>
</div>
