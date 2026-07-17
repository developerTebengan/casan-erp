<script lang="ts">
	import { untrack } from 'svelte';
	import { Input, Select, Button } from '$lib/components/ui';
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

	let code = $state(untrack(() => product?.code ?? ''));
	let name = $state(untrack(() => product?.name ?? ''));
	let categoryId = $state(untrack(() => product?.categoryId ?? ''));
	let unit = $state(untrack(() => product?.unit ?? 'PCS'));
	let stock = $state(untrack(() => product?.stock ?? 0));
	let minimumStock = $state(untrack(() => product?.minimumStock ?? 0));
	let status = $state(untrack(() => product?.status ?? 'ACTIVE'));

	const categoryOptions = $derived(categories.map((c) => ({ value: c.id, label: c.name })));
	const statusOptions = $derived([
		{ value: 'ACTIVE', label: 'Active' },
		{ value: 'INACTIVE', label: 'Inactive' }
	]);

	function handleSubmit(e: Event) {
		e.preventDefault();
		const data = {
			code,
			name,
			categoryId,
			unit,
			stock: Number(stock),
			minimumStock: Number(minimumStock),
			status
		};
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 sm:grid-cols-2">
		<Input label="Product Code" name="code" bind:value={code} required error={errors.code} />
		<Input label="Product Name" name="name" bind:value={name} required error={errors.name} />
		<Select
			label="Category"
			name="categoryId"
			options={categoryOptions}
			bind:value={categoryId}
			required
			error={errors.categoryId}
		/>
		<Input label="Unit" name="unit" bind:value={unit} required error={errors.unit} />
		<Input
			label="Stock"
			name="stock"
			type="number"
			bind:value={stock}
			required
			error={errors.stock}
		/>
		<Input
			label="Minimum Stock"
			name="minimumStock"
			type="number"
			bind:value={minimumStock}
			required
			error={errors.minimumStock}
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

	<div class="flex justify-end gap-3">
		<Button variant="secondary" href="/inventory">Cancel</Button>
		<Button type="submit" variant="primary" {loading}>{submitLabel}</Button>
	</div>
</form>
