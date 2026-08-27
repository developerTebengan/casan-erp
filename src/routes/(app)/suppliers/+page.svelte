<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus, Phone, MapPin, Mail, User, Clock, FileText } from '@lucide/svelte';
	import {
		Card,
		Button,
		Input,
		Select,
		Breadcrumb,
		DataTable,
		Pagination,
		Modal,
		ConfirmDialog,
		EmptyState,
		Spinner,
		StatusStatTabs,
		Badge
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { Purchase, Supplier } from '$lib/types';

	let { data } = $props();

	let suppliers = $state<Supplier[]>(untrack(() => data.suppliers.data));
	let pagination = $state(untrack(() => data.suppliers.pagination));
	let typeCounts = $state(untrack(() => data.typeCounts ?? { ALL: 0 }));
	let typeTab = $state('ALL');
	let search = $state('');
	let loading = $state(false);

	let modalMode = $state<'create' | 'edit' | 'detail' | null>(null);
	let selectedSupplier = $state<Partial<Supplier>>({});
	let modalLoading = $state(false);
	let modalErrors = $state<Record<string, string>>({});

	let purchaseHistory = $state<Purchase[]>([]);
	let purchaseTotalSpend = $state(0);
	let purchaseHistoryLoading = $state(false);

	let deleteId = $state<string | null>(null);
	let deleting = $state(false);

	async function loadSuppliers(page = 1) {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			if (typeTab && typeTab !== 'ALL') params.set('type', typeTab);
			params.set('page', String(page));
			params.set('limit', '10');

			const res = await fetch(`/api/suppliers?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				suppliers = result.data;
				pagination = result.pagination;
				if (result.typeCounts) typeCounts = result.typeCounts;
			}
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		loadSuppliers(1);
	}

	function switchType(id: string) {
		typeTab = id;
		loadSuppliers(1);
	}

	const supplierTypeOptions = [
		{ value: 'GENERAL', label: 'General' },
		{ value: 'MANUFACTURER', label: 'Manufacturer' },
		{ value: 'DISTRIBUTOR', label: 'Distributor' },
		{ value: 'RETAILER', label: 'Retailer' },
		{ value: 'SERVICE', label: 'Service' },
		{ value: 'OTHER', label: 'Other' }
	];

	const statusOptions = [
		{ value: 'ACTIVE', label: 'Active' },
		{ value: 'INACTIVE', label: 'Inactive' }
	];

	const typeTabs = $derived([
		{ id: 'ALL', label: 'All', count: typeCounts.ALL ?? 0, variant: 'secondary' as const },
		...supplierTypeOptions.map((opt) => ({
			id: opt.value,
			label: opt.label,
			count: typeCounts[opt.value] ?? 0,
			variant: 'secondary' as const
		}))
	]);

	function emptySupplier(): Partial<Supplier> {
		return {
			name: '',
			type: 'GENERAL',
			phone: '',
			address: '',
			contactPerson: '',
			email: '',
			paymentTerms: '',
			leadTimeDays: null,
			taxId: '',
			status: 'ACTIVE'
		};
	}

	function openCreate() {
		selectedSupplier = emptySupplier();
		modalErrors = {};
		modalMode = 'create';
	}

	function openEdit(supplier: Supplier) {
		selectedSupplier = {
			...supplier,
			type: supplier.type ?? 'GENERAL',
			phone: supplier.phone ?? '',
			address: supplier.address ?? '',
			contactPerson: supplier.contactPerson ?? '',
			email: supplier.email ?? '',
			paymentTerms: supplier.paymentTerms ?? '',
			leadTimeDays: supplier.leadTimeDays ?? null,
			taxId: supplier.taxId ?? '',
			status: supplier.status ?? 'ACTIVE'
		};
		modalErrors = {};
		modalMode = 'edit';
	}

	async function loadPurchaseHistory(supplierId: string) {
		purchaseHistoryLoading = true;
		purchaseHistory = [];
		purchaseTotalSpend = 0;
		try {
			const params = new URLSearchParams({
				supplierId,
				page: '1',
				limit: '10'
			});
			const res = await fetch(`/api/purchases?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				purchaseHistory = result.data ?? [];
				purchaseTotalSpend = purchaseHistory.reduce(
					(sum: number, p: Purchase) => sum + (p.total || 0),
					0
				);
			}
		} finally {
			purchaseHistoryLoading = false;
		}
	}

	function openDetail(supplier: Supplier) {
		selectedSupplier = { ...supplier };
		modalMode = 'detail';
		if (supplier.id) loadPurchaseHistory(supplier.id);
	}

	function closeModal() {
		modalMode = null;
		selectedSupplier = {};
		modalErrors = {};
		purchaseHistory = [];
		purchaseTotalSpend = 0;
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
					type: selectedSupplier.type || 'GENERAL',
					phone: selectedSupplier.phone,
					address: selectedSupplier.address,
					contactPerson: selectedSupplier.contactPerson,
					email: selectedSupplier.email,
					paymentTerms: selectedSupplier.paymentTerms,
					leadTimeDays: selectedSupplier.leadTimeDays,
					taxId: selectedSupplier.taxId,
					status: selectedSupplier.status || 'ACTIVE'
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

	function statusBadge(s: Supplier) {
		const active = (s.status ?? 'ACTIVE') === 'ACTIVE';
		const classes = active
			? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600'
			: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${s.status ?? 'ACTIVE'}</span>`;
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
		{ key: 'type', header: 'Type', cell: (s: Supplier) => s.type || 'GENERAL' },
		{ key: 'contactPerson', header: 'Contact', cell: (s: Supplier) => s.contactPerson || '-' },
		{ key: 'phone', header: 'Phone', cell: (s: Supplier) => s.phone || '-' },
		{ key: 'status', header: 'Status', cell: statusBadge },
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

	<StatusStatTabs tabs={typeTabs} active={typeTab} onchange={switchType} />

	<Card padding="md">
		<Input
			label="Search"
			placeholder="Search by name, contact, phone, email..."
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
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<Input
				label="Supplier Name"
				bind:value={selectedSupplier.name}
				required
				error={modalErrors.name}
			/>
		</div>
		<Select
			label="Supplier Type"
			options={supplierTypeOptions}
			bind:value={
				() => selectedSupplier.type ?? 'GENERAL',
				(v) => (selectedSupplier.type = v)
			}
		/>
		<Select
			label="Status"
			options={statusOptions}
			bind:value={
				() => selectedSupplier.status ?? 'ACTIVE',
				(v) => (selectedSupplier.status = v as Supplier['status'])
			}
		/>
		<Input
			label="Contact Person"
			bind:value={
				() => selectedSupplier.contactPerson ?? '',
				(v) => (selectedSupplier.contactPerson = v)
			}
			error={modalErrors.contactPerson}
		/>
		<Input
			label="Email"
			type="email"
			bind:value={() => selectedSupplier.email ?? '', (v) => (selectedSupplier.email = v)}
			error={modalErrors.email}
		/>
		<Input
			label="Phone"
			bind:value={() => selectedSupplier.phone ?? '', (v) => (selectedSupplier.phone = v)}
			error={modalErrors.phone}
		/>
		<Input
			label="Tax ID"
			bind:value={() => selectedSupplier.taxId ?? '', (v) => (selectedSupplier.taxId = v)}
			error={modalErrors.taxId}
		/>
		<Input
			label="Payment Terms"
			placeholder="e.g. Net 30"
			bind:value={
				() => selectedSupplier.paymentTerms ?? '',
				(v) => (selectedSupplier.paymentTerms = v)
			}
			error={modalErrors.paymentTerms}
		/>
		<Input
			label="Lead Time (days)"
			type="number"
			bind:value={
				() =>
					selectedSupplier.leadTimeDays != null ? String(selectedSupplier.leadTimeDays) : '',
				(v) => {
					selectedSupplier.leadTimeDays = v === '' ? null : Number(v);
				}
			}
			error={modalErrors.leadTimeDays}
		/>
		<div class="sm:col-span-2">
			<Input
				label="Address"
				bind:value={
					() => selectedSupplier.address ?? '',
					(v) => (selectedSupplier.address = v)
				}
				error={modalErrors.address}
			/>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closeModal}>Cancel</Button>
		<Button variant="primary" loading={modalLoading} onclick={handleSave}>
			{modalMode === 'create' ? 'Create' : 'Save Changes'}
		</Button>
	{/snippet}
</Modal>

<Modal open={modalMode === 'detail'} title="Supplier Details" onclose={closeModal}>
	<div class="space-y-5">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30">
				<span class="text-lg font-bold">{selectedSupplier.name?.charAt(0).toUpperCase()}</span>
			</div>
			<div>
				<h3 class="text-main text-lg font-semibold">{selectedSupplier.name}</h3>
				<p class="text-muted text-sm">Type: {selectedSupplier.type || 'GENERAL'}</p>
			</div>
			<Badge variant={(selectedSupplier.status ?? 'ACTIVE') === 'ACTIVE' ? 'success' : 'secondary'}>
				{selectedSupplier.status ?? 'ACTIVE'}
			</Badge>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			{#if selectedSupplier.contactPerson}
				<div class="flex items-start gap-3">
					<User class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Contact Person</p>
						<p class="text-main">{selectedSupplier.contactPerson}</p>
					</div>
				</div>
			{/if}
			{#if selectedSupplier.email}
				<div class="flex items-start gap-3">
					<Mail class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Email</p>
						<p class="text-main">{selectedSupplier.email}</p>
					</div>
				</div>
			{/if}
			{#if selectedSupplier.phone}
				<div class="flex items-start gap-3">
					<Phone class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Phone</p>
						<p class="text-main">{selectedSupplier.phone}</p>
					</div>
				</div>
			{/if}
			{#if selectedSupplier.taxId}
				<div class="flex items-start gap-3">
					<FileText class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Tax ID</p>
						<p class="text-main">{selectedSupplier.taxId}</p>
					</div>
				</div>
			{/if}
			{#if selectedSupplier.paymentTerms}
				<div class="flex items-start gap-3">
					<FileText class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Payment Terms</p>
						<p class="text-main">{selectedSupplier.paymentTerms}</p>
					</div>
				</div>
			{/if}
			{#if selectedSupplier.leadTimeDays != null}
				<div class="flex items-start gap-3">
					<Clock class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Lead Time</p>
						<p class="text-main">{selectedSupplier.leadTimeDays} days</p>
					</div>
				</div>
			{/if}
			{#if selectedSupplier.address}
				<div class="flex items-start gap-3 sm:col-span-2">
					<MapPin class="mt-0.5 h-5 w-5 text-slate-400" />
					<div>
						<p class="text-muted text-sm">Address</p>
						<p class="text-main">{selectedSupplier.address}</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="border-theme border-t pt-4">
			<div class="mb-3 flex items-center justify-between gap-3">
				<h4 class="text-main font-semibold">Purchase history</h4>
				<p class="text-muted text-sm">
					Shown total: <span class="text-main font-medium">{formatCurrency(purchaseTotalSpend)}</span>
				</p>
			</div>
			{#if purchaseHistoryLoading}
				<div class="flex justify-center py-6">
					<Spinner size="md" />
				</div>
			{:else if purchaseHistory.length === 0}
				<p class="text-muted text-sm">No purchases for this supplier yet.</p>
			{:else}
				<ul class="divide-theme divide-y">
					{#each purchaseHistory as p (p.id)}
						<li class="flex items-center justify-between gap-3 py-2.5">
							<div>
								<a href="/purchasing/{p.id}" class="text-primary-600 hover:underline text-sm font-medium">
									{p.prNumber}
								</a>
								<p class="text-muted text-xs">{formatDate(p.dateOfRequest)} · {p.approvalStatus}</p>
							</div>
							<p class="text-main text-sm font-medium">{formatCurrency(p.total)}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
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
