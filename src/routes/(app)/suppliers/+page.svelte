<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus, Edit, Trash2, Eye, Phone, MapPin } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Breadcrumb,
		DataTable,
		Pagination,
		Modal,
		ConfirmDialog,
		EmptyState,
		Spinner
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Supplier } from '$lib/types';

	let { data } = $props();

	let suppliers = $state<Supplier[]>(untrack(() => data.suppliers.data));
	let pagination = $state(untrack(() => data.suppliers.pagination));
	let search = $state('');
	let loading = $state(false);

	let modalMode = $state<'create' | 'edit' | 'detail' | null>(null);
	let selectedSupplier = $state<Partial<Supplier>>({});
	let modalLoading = $state(false);
	let modalErrors = $state<Record<string, string>>({});

	let deleteId = $state<string | null>(null);
	let deleting = $state(false);

	async function loadSuppliers(page = 1) {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			params.set('page', String(page));
			params.set('limit', '10');

			const res = await fetch(`/api/suppliers?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				suppliers = result.data;
				pagination = result.pagination;
			}
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadSuppliers(1);
	}

	function openCreate() {
		selectedSupplier = { name: '', phone: '', address: '' };
		selectedSupplier.phone = '';
		selectedSupplier.address = '';
		modalErrors = {};
		modalMode = 'create';
	}

	function openEdit(supplier: Supplier) {
		selectedSupplier = {
			...supplier,
			phone: supplier.phone ?? '',
			address: supplier.address ?? ''
		};
		modalErrors = {};
		modalMode = 'edit';
	}

	function openDetail(supplier: Supplier) {
		selectedSupplier = { ...supplier };
		modalMode = 'detail';
	}

	function closeModal() {
		modalMode = null;
		selectedSupplier = {};
		modalErrors = {};
	}

	async function handleSave() {
		modalLoading = true;
		modalErrors = {};
		try {
			const isCreate = modalMode === 'create';
			const url = isCreate ? '/api/suppliers' : `/api/suppliers/${selectedSupplier.id}`;
			const method = isCreate ? 'POST' : 'PUT';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: selectedSupplier.name,
					phone: selectedSupplier.phone,
					address: selectedSupplier.address
				})
			});

			if (res.ok) {
				await loadSuppliers(pagination.page);
				toastStore.success(
					isCreate ? 'Supplier created successfully' : 'Supplier updated successfully'
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
				toastStore.error(errorData.message || 'Failed to save supplier');
			}
		} finally {
			modalLoading = false;
		}
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleting = true;
		try {
			const res = await fetch(`/api/suppliers/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				await loadSuppliers(pagination.page);
				toastStore.success('Supplier deleted successfully');
			} else {
				toastStore.error('Failed to delete supplier');
			}
		} finally {
			deleting = false;
			deleteId = null;
		}
	}

	function actionsCell(s: Supplier) {
		return `
			<div class="flex items-center gap-2">
				<button type="button" data-detail="${s.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
				</button>
				<button type="button" data-edit="${s.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
				</button>
				<button type="button" data-delete="${s.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</button>
			</div>
		`;
	}

	const columns = [
		{ key: 'name', header: 'Supplier Name' },
		{ key: 'phone', header: 'Phone', cell: (s: Supplier) => s.phone || '-' },
		{ key: 'address', header: 'Address', cell: (s: Supplier) => s.address || '-' },
		{ key: 'actions', header: '', cell: actionsCell }
	];

	function handleRowClick(row: Supplier, e: MouseEvent) {
		const target = e.target as HTMLElement;
		const detailBtn = target.closest('[data-detail]') as HTMLElement | null;
		const editBtn = target.closest('[data-edit]') as HTMLElement | null;
		const deleteBtn = target.closest('[data-delete]') as HTMLElement | null;

		if (detailBtn) {
			const supplier = suppliers.find((s) => s.id === detailBtn.dataset.detail);
			if (supplier) openDetail(supplier);
			return;
		}
		if (editBtn) {
			const supplier = suppliers.find((s) => s.id === editBtn.dataset.edit);
			if (supplier) openEdit(supplier);
			return;
		}
		if (deleteBtn) {
			deleteId = deleteBtn.dataset.delete ?? null;
			return;
		}
		openDetail(row);
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Suppliers' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Suppliers</h1>
			<p class="text-muted">Manage your suppliers</p>
		</div>
		<Button variant="primary" onclick={openCreate}>
			<Plus class="h-4 w-4" />
			Add Supplier
		</Button>
	</div>

	<Card padding="md">
		<Input
			label="Search"
			placeholder="Search by name, phone, or address..."
			bind:value={search}
			oninput={handleSearch}
		/>
	</Card>

	{#if loading && suppliers.length === 0}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if suppliers.length === 0}
		<EmptyState title="No suppliers found" description="Start by adding a new supplier.">
			<Button variant="primary" onclick={openCreate}>
				<Plus class="h-4 w-4" />
				Add Supplier
			</Button>
		</EmptyState>
	{:else}
		<DataTable {columns} rows={suppliers} {loading} onrowclick={handleRowClick} />
		<Pagination {...pagination} onpagechange={loadSuppliers} />
	{/if}
</div>

<Modal
	open={modalMode === 'create' || modalMode === 'edit'}
	title={modalMode === 'create' ? 'Add Supplier' : 'Edit Supplier'}
	onclose={closeModal}
>
	<div class="space-y-4">
		<Input
			label="Supplier Name"
			bind:value={selectedSupplier.name}
			required
			error={modalErrors.name}
		/>
		<Input
			label="Phone"
			bind:value={() => selectedSupplier.phone ?? '', (v) => (selectedSupplier.phone = v)}
			error={modalErrors.phone}
		/>
		<Input
			label="Address"
			bind:value={() => selectedSupplier.address ?? '', (v) => (selectedSupplier.address = v)}
			error={modalErrors.address}
		/>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closeModal}>Cancel</Button>
		<Button variant="primary" loading={modalLoading} onclick={handleSave}>
			{modalMode === 'create' ? 'Create' : 'Save Changes'}
		</Button>
	{/snippet}
</Modal>

<Modal open={modalMode === 'detail'} title="Supplier Details" onclose={closeModal}>
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30">
				<span class="text-lg font-bold">{selectedSupplier.name?.charAt(0).toUpperCase()}</span>
			</div>
			<div>
				<h3 class="text-main text-lg font-semibold">{selectedSupplier.name}</h3>
			</div>
		</div>
		{#if selectedSupplier.phone}
			<div class="flex items-start gap-3">
				<Phone class="h-5 w-5 text-slate-400" />
				<div>
					<p class="text-muted text-sm">Phone</p>
					<p class="text-main">{selectedSupplier.phone}</p>
				</div>
			</div>
		{/if}
		{#if selectedSupplier.address}
			<div class="flex items-start gap-3">
				<MapPin class="h-5 w-5 text-slate-400" />
				<div>
					<p class="text-muted text-sm">Address</p>
					<p class="text-main">{selectedSupplier.address}</p>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closeModal}>Close</Button>
		<Button
			variant="primary"
			onclick={() => {
				const supplierId = selectedSupplier.id;
				closeModal();
				if (supplierId) openEdit(suppliers.find((s) => s.id === supplierId)!);
			}}
		>
			Edit
		</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	open={!!deleteId}
	title="Delete Supplier"
	message="Are you sure you want to delete this supplier? This action cannot be undone."
	confirmText="Delete"
	loading={deleting}
	onconfirm={handleDelete}
	oncancel={() => (deleteId = null)}
/>
