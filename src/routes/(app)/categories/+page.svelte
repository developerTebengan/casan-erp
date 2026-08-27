<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Breadcrumb,
		DataTable,
		Modal,
		ConfirmDialog,
		EmptyState,
		Spinner
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Category } from '$lib/types';

	let { data } = $props();

	let categories = $state<Category[]>(untrack(() => data.categories));
	let search = $state('');
	let loading = $state(false);

	let modalMode = $state<'create' | 'edit' | null>(null);
	let selectedCategory = $state<Partial<Category>>({});
	let modalLoading = $state(false);
	let modalErrors = $state<Record<string, string>>({});

	let deleteId = $state<string | null>(null);
	let deleting = $state(false);

	const filtered = $derived(
		search.trim()
			? categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
			: categories
	);

	async function loadCategories() {
		loading = true;
		try {
			const res = await fetch('/api/categories');
			if (res.ok) {
				categories = await res.json();
			}
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		selectedCategory = { name: '' };
		modalErrors = {};
		modalMode = 'create';
	}

	function openEdit(category: Category) {
		selectedCategory = { ...category };
		modalErrors = {};
		modalMode = 'edit';
	}

	function closeModal() {
		modalMode = null;
		selectedCategory = {};
		modalErrors = {};
	}

	async function handleSave() {
		modalLoading = true;
		modalErrors = {};
		try {
			const isCreate = modalMode === 'create';
			const url = isCreate ? '/api/categories' : `/api/categories/${selectedCategory.id}`;
			const method = isCreate ? 'POST' : 'PUT';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: selectedCategory.name })
			});

			if (res.ok) {
				await loadCategories();
				toastStore.success(
					isCreate ? 'Category created successfully' : 'Category updated successfully'
				);
				closeModal();
			} else {
				const errorData = await res.json().catch(() => ({}));
				modalErrors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to save category');
			}
		} finally {
			modalLoading = false;
		}
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleting = true;
		try {
			const res = await fetch(`/api/categories/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				await loadCategories();
				toastStore.success('Category deleted successfully');
			} else {
				const errorData = await res.json().catch(() => ({}));
				const formError = errorData.errors?.form;
				toastStore.error(
					Array.isArray(formError) ? formError[0] : errorData.message || 'Failed to delete category'
				);
			}
		} finally {
			deleting = false;
			deleteId = null;
		}
	}

	function actionsCell(c: Category) {
		return `
			<div class="flex items-center gap-2">
				<button type="button" data-edit="${c.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
				</button>
				<button type="button" data-delete="${c.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</button>
			</div>
		`;
	}

	const columns = [
		{ key: 'name', header: 'Category Name' },
		{ key: 'actions', header: '', cell: actionsCell }
	];

	function handleRowClick(row: Category, e: MouseEvent) {
		const target = e.target as HTMLElement;
		const editBtn = target.closest('[data-edit]') as HTMLElement | null;
		const deleteBtn = target.closest('[data-delete]') as HTMLElement | null;

		if (editBtn) {
			const category = categories.find((c) => c.id === editBtn.dataset.edit);
			if (category) openEdit(category);
			return;
		}
		if (deleteBtn) {
			deleteId = deleteBtn.dataset.delete ?? null;
			return;
		}
		openEdit(row);
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Categories' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Categories</h1>
			<p class="text-muted">Manage product categories</p>
		</div>
		<Button variant="primary" onclick={openCreate}>
			<Plus class="h-4 w-4" />
			Add Category
		</Button>
	</div>

	<Card padding="md">
		<Input
			label="Search"
			placeholder="Search by name..."
			bind:value={search}
		/>
	</Card>

	{#if loading && categories.length === 0}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if filtered.length === 0}
		<EmptyState title="No categories found" description="Start by adding a new category.">
			<Button variant="primary" onclick={openCreate}>
				<Plus class="h-4 w-4" />
				Add Category
			</Button>
		</EmptyState>
	{:else}
		<DataTable {columns} rows={filtered} {loading} onrowclick={handleRowClick} />
	{/if}
</div>

<Modal
	open={modalMode === 'create' || modalMode === 'edit'}
	title={modalMode === 'create' ? 'Add Category' : 'Edit Category'}
	onclose={closeModal}
>
	<div class="space-y-4">
		<Input
			label="Category Name"
			bind:value={selectedCategory.name}
			required
			error={modalErrors.name}
		/>
		{#if modalErrors.form}
			<p class="text-sm text-danger-600">{modalErrors.form}</p>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closeModal}>Cancel</Button>
		<Button variant="primary" loading={modalLoading} onclick={handleSave}>
			{modalMode === 'create' ? 'Create' : 'Save Changes'}
		</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	open={!!deleteId}
	title="Delete Category"
	message="Are you sure you want to delete this category? This action cannot be undone."
	confirmText="Delete"
	loading={deleting}
	onconfirm={handleDelete}
	oncancel={() => (deleteId = null)}
/>
