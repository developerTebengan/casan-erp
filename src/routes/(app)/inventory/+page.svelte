<script lang="ts">
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plus } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		DataTable,
		Pagination,
		Breadcrumb,
		ConfirmDialog,
		EmptyState,
		Spinner,
		Modal
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatNumber } from '$lib/utils/format';
	import type { Product, Category } from '$lib/types';

	let { data } = $props();

	let products = $state<Product[]>(untrack(() => data.products.data));
	let pagination = $state(untrack(() => data.products.pagination));
	let categories = $state<Category[]>(untrack(() => data.categories));
	let search = $state('');
	let categoryId = $state('');
	let status = $state('');
	let stockFilter = $state('');
	let loading = $state(false);
	let deleteId = $state<string | null>(null);
	let deleting = $state(false);

	type ReorderSupplierRow = {
		supplierId: string;
		supplierName: string;
		productCount: number;
		products: string[];
	};
	let reorderOpen = $state(false);
	let reorderLoading = $state(false);
	let reorderRows = $state<ReorderSupplierRow[]>([]);

	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'ACTIVE', label: 'Active' },
		{ value: 'INACTIVE', label: 'Inactive' }
	];

	const categoryOptions = $derived([
		{ value: '', label: 'All Categories' },
		...categories.map((c) => ({ value: c.id, label: c.name }))
	]);

	async function loadProducts(page = 1) {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			if (categoryId) params.set('categoryId', categoryId);
			if (status) params.set('status', status);
			if (stockFilter === '1') params.set('lowStock', '1');
			params.set('page', String(page));
			params.set('limit', '10');

			const res = await fetch(`/api/products?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				products = result.data;
				pagination = result.pagination;
			}
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadProducts(1);
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleting = true;
		try {
			const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				toastStore.success('Product deleted successfully');
				await loadProducts(pagination.page);
			} else {
				toastStore.error('Failed to delete product');
			}
		} finally {
			deleting = false;
			deleteId = null;
		}
	}

	function statusBadge(p: Product) {
		const classes =
			p.status === 'ACTIVE'
				? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600'
				: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-600';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${p.status}</span>`;
	}

	function stockBadge(p: Product) {
		const isLow = p.stock <= p.minimumStock;
		const classes = isLow
			? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600'
			: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${formatNumber(p.stock)} ${p.unit}</span>`;
	}

	function actionsCell(p: Product) {
		return `
			<div class="flex items-center gap-2">
				<a href="/inventory/${p.id}/edit" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
				</a>
				<button type="button" data-delete="${p.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</button>
			</div>
		`;
	}

	function photoCell(p: Product) {
		if (p.imageUrl) {
			return `<img src="${p.imageUrl}" alt="" class="h-10 w-10 rounded object-cover border border-slate-200" />`;
		}
		return `<span class="inline-flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">N/A</span>`;
	}

	const columns = [
		{ key: 'photo', header: 'Photo', cell: photoCell },
		{ key: 'code', header: 'Code' },
		{ key: 'name', header: 'Product Name' },
		{ key: 'category', header: 'Category / Type', cell: (p: Product) => p.category?.name ?? '-' },
		{ key: 'stock', header: 'Stock', cell: stockBadge },
		{ key: 'status', header: 'Status', cell: statusBadge },
		{ key: 'actions', header: '', cell: actionsCell }
	];

	function handleRowClick(row: Product, e: MouseEvent) {
		const target = e.target as HTMLElement;
		const deleteBtn = target.closest('[data-delete]') as HTMLElement | null;
		if (deleteBtn) {
			deleteId = deleteBtn.dataset.delete ?? null;
			return;
		}
		goto(`/inventory/${row.id}`);
	}

	async function openReorderBySupplier() {
		reorderOpen = true;
		reorderLoading = true;
		reorderRows = [];
		try {
			const res = await fetch('/api/products?lowStock=1&status=ACTIVE&limit=100&page=1');
			if (!res.ok) {
				toastStore.error('Failed to load low-stock products');
				return;
			}
			const result = await res.json();
			const lowStockProducts: Product[] = result.data ?? [];
			const bySupplier = new Map<string, ReorderSupplierRow>();
			for (const p of lowStockProducts) {
				if (!p.preferredSupplierId) continue;
				const existing = bySupplier.get(p.preferredSupplierId);
				const name = p.preferredSupplier?.name ?? 'Unknown supplier';
				if (existing) {
					existing.productCount += 1;
					existing.products.push(p.name);
				} else {
					bySupplier.set(p.preferredSupplierId, {
						supplierId: p.preferredSupplierId,
						supplierName: name,
						productCount: 1,
						products: [p.name]
					});
				}
			}
			reorderRows = [...bySupplier.values()].sort((a, b) =>
				a.supplierName.localeCompare(b.supplierName)
			);
		} finally {
			reorderLoading = false;
		}
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('lowStock') === '1') {
			stockFilter = '1';
			loadProducts(1);
		} else if (!categories.length) {
			loadProducts();
		}
		if (params.get('reorder') === '1') {
			openReorderBySupplier();
		}
	});
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Inventory' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Inventory</h1>
			<p class="text-muted">Manage your products and stock levels</p>
		</div>
		<div class="flex flex-wrap gap-3">
			{#if stockFilter === '1' || products.some((p) => p.stock <= p.minimumStock)}
				<Button href="/purchasing/new?fromLowStock=1" variant="secondary">
					Create PR from low stock
				</Button>
				<Button variant="secondary" onclick={openReorderBySupplier}>
					Reorder by supplier
				</Button>
			{/if}
			<Button href="/inventory/new" variant="primary">
				<Plus class="h-4 w-4" />
				Add Product
			</Button>
		</div>
	</div>

	<Card padding="md">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
			<div class="flex-1">
				<Input
					label="Search"
					placeholder="Search by code or name..."
					bind:value={search}
					oninput={handleSearch}
				/>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:w-[560px]">
				<Select
					label="Category"
					options={categoryOptions}
					bind:value={categoryId}
					onchange={handleSearch}
				/>
				<Select
					label="Status"
					options={statusOptions}
					bind:value={status}
					onchange={handleSearch}
				/>
				<Select
					label="Stock"
					options={[
						{ value: '', label: 'All stock levels' },
						{ value: '1', label: 'Low stock only' }
					]}
					bind:value={stockFilter}
					onchange={handleSearch}
				/>
			</div>
		</div>
	</Card>

	{#if loading && products.length === 0}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if products.length === 0}
		<EmptyState
			title="No products found"
			description="Try adjusting your search or add a new product."
		>
			<Button href="/inventory/new" variant="primary">
				<Plus class="h-4 w-4" />
				Add Product
			</Button>
		</EmptyState>
	{:else}
		<DataTable {columns} rows={products} {loading} onrowclick={handleRowClick} />
		<Pagination {...pagination} onpagechange={loadProducts} />
	{/if}

	<ConfirmDialog
		open={!!deleteId}
		title="Delete Product"
		message="Are you sure you want to delete this product? This action cannot be undone."
		confirmText="Delete"
		loading={deleting}
		onconfirm={handleDelete}
		oncancel={() => (deleteId = null)}
	/>

	<Modal
		open={reorderOpen}
		title="Reorder by supplier"
		onclose={() => (reorderOpen = false)}
	>
		{#if reorderLoading}
			<div class="flex justify-center py-8">
				<Spinner size="md" />
			</div>
		{:else if reorderRows.length === 0}
			<p class="text-muted text-sm">
				No low-stock products have a preferred supplier set. Assign preferred suppliers on products
				first.
			</p>
		{:else}
			<ul class="divide-theme divide-y">
				{#each reorderRows as row (row.supplierId)}
					<li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p class="text-main font-medium">{row.supplierName}</p>
							<p class="text-muted text-xs">
								{row.productCount} low-stock item{row.productCount === 1 ? '' : 's'}:
								{row.products.slice(0, 3).join(', ')}{row.products.length > 3 ? '…' : ''}
							</p>
						</div>
						<Button
							href={`/purchasing/new?fromLowStock=1&supplierId=${row.supplierId}`}
							variant="primary"
							size="sm"
						>
							Create PR
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
		{#snippet footer()}
			<Button variant="secondary" onclick={() => (reorderOpen = false)}>Close</Button>
		{/snippet}
	</Modal>
</div>
