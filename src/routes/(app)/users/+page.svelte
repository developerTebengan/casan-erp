<script lang="ts">
	import {
		Breadcrumb,
		Button,
		Card,
		ConfirmDialog,
		DataTable,
		EmptyState,
		Input,
		Modal,
		Select,
		Spinner
	} from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { User, UserRole } from '$lib/types';
	import { Mail, Plus, Shield } from '@lucide/svelte';
	import { untrack } from 'svelte';

	let { data } = $props();

	let users = $state<User[]>(untrack(() => data.users));
	let search = $state('');
	let loading = $state(false);

	let modalMode = $state<'create' | 'edit' | 'detail' | null>(null);
	let selectedUser = $state<Partial<User> & { password?: string }>({});
	let modalLoading = $state(false);
	let modalErrors = $state<Record<string, string>>({});

	let deleteId = $state<string | null>(null);
	let deleting = $state(false);

	const roleOptions = [
		{ value: 'ADMIN', label: 'Admin' },
		{ value: 'USER', label: 'Requester' },
		{ value: 'BUYER', label: 'Buyer' },
		{ value: 'STOCK_KEEPER', label: 'Stock Keeper' },
		{ value: 'DEPARTMENT_HEAD', label: 'Department Head' },
		{ value: 'FINANCE', label: 'Finance' },
		{ value: 'MANAGER', label: 'Manager' },
		{ value: 'DIRECTOR', label: 'Director' }
	];

	const filteredUsers = $derived(
		users.filter(
			(u) =>
				u.name.toLowerCase().includes(search.toLowerCase()) ||
				u.email.toLowerCase().includes(search.toLowerCase()) ||
				u.role.toLowerCase().includes(search.toLowerCase())
		)
	);

	function openCreate() {
		selectedUser = { name: '', email: '', role: 'USER', password: '' };
		modalErrors = {};
		modalMode = 'create';
	}

	function openEdit(user: User) {
		selectedUser = { ...user, password: '' };
		modalErrors = {};
		modalMode = 'edit';
	}

	function openDetail(user: User) {
		selectedUser = { ...user };
		modalMode = 'detail';
	}

	function closeModal() {
		modalMode = null;
		selectedUser = {};
		modalErrors = {};
	}

	function roleLabel(role: UserRole) {
		return roleOptions.find((r) => r.value === role)?.label ?? role;
	}

	async function handleSave() {
		modalLoading = true;
		modalErrors = {};
		try {
			const isCreate = modalMode === 'create';
			const url = isCreate ? '/api/users' : `/api/users/${selectedUser.id}`;
			const method = isCreate ? 'POST' : 'PUT';

			const body: Record<string, unknown> = {
				name: selectedUser.name,
				email: selectedUser.email,
				role: selectedUser.role
			};
			if (selectedUser.password) body.password = selectedUser.password;

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (res.ok) {
				const result = await res.json();
				if (isCreate) {
					users = [...users, result].sort((a, b) => a.name.localeCompare(b.name));
					toastStore.success('User created successfully');
				} else {
					users = users.map((u) => (u.id === result.id ? result : u));
					toastStore.success('User updated successfully');
				}
				closeModal();
			} else {
				const errorData = await res.json().catch(() => ({}));
				modalErrors = Object.fromEntries(
					Object.entries(errorData.errors || {}).map(([k, v]) => [
						k,
						Array.isArray(v) ? v[0] : String(v)
					])
				);
				toastStore.error(errorData.message || 'Failed to save user');
			}
		} finally {
			modalLoading = false;
		}
	}

	async function handleDelete() {
		if (!deleteId) return;
		deleting = true;
		try {
			const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				users = users.filter((u) => u.id !== deleteId);
				toastStore.success('User deleted successfully');
			} else {
				toastStore.error('Failed to delete user');
			}
		} finally {
			deleting = false;
			deleteId = null;
		}
	}

	function actionsCell(u: User) {
		return `
			<div class="flex items-center gap-2">
				<button type="button" data-detail="${u.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
				</button>
				<button type="button" data-edit="${u.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
				</button>
				<button type="button" data-delete="${u.id}" class="inline-flex items-center rounded-lg p-2 text-slate-500 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
				</button>
			</div>
		`;
	}

	const columns = [
		{ key: 'name', header: 'Name' },
		{ key: 'email', header: 'Email' },
		{
			key: 'role',
			header: 'Role',
			cell: (u: User) => roleLabel(u.role)
		},
		{ key: 'actions', header: '', cell: actionsCell }
	];

	function handleRowClick(row: User, e: MouseEvent) {
		const target = e.target as HTMLElement;
		const detailBtn = target.closest('[data-detail]') as HTMLElement | null;
		const editBtn = target.closest('[data-edit]') as HTMLElement | null;
		const deleteBtn = target.closest('[data-delete]') as HTMLElement | null;

		if (detailBtn) {
			const user = users.find((u) => u.id === detailBtn.dataset.detail);
			if (user) openDetail(user);
			return;
		}
		if (editBtn) {
			const user = users.find((u) => u.id === editBtn.dataset.edit);
			if (user) openEdit(user);
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
	<Breadcrumb items={[{ label: 'Users' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Users</h1>
			<p class="text-muted">Manage system users and approval roles</p>
		</div>
		<Button variant="primary" onclick={openCreate}>
			<Plus class="h-4 w-4" />
			Add User
		</Button>
	</div>

	<Card padding="md">
		<Input label="Search" placeholder="Search by name, email, or role..." bind:value={search} />
	</Card>

	{#if loading && users.length === 0}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if filteredUsers.length === 0}
		<EmptyState title="No users found" description="Start by adding a new user.">
			<Button variant="primary" onclick={openCreate}>
				<Plus class="h-4 w-4" />
				Add User
			</Button>
		</EmptyState>
	{:else}
		<DataTable {columns} rows={filteredUsers} {loading} onrowclick={handleRowClick} />
	{/if}
</div>

<Modal
	open={modalMode === 'create' || modalMode === 'edit'}
	title={modalMode === 'create' ? 'Add User' : 'Edit User'}
	onclose={closeModal}
>
	<div class="space-y-4">
		<Input label="Name" bind:value={selectedUser.name} required error={modalErrors.name} />
		<Input
			label="Email"
			type="email"
			bind:value={selectedUser.email}
			required
			error={modalErrors.email}
		/>
		<Select
			label="Role"
			options={roleOptions}
			bind:value={() => selectedUser.role ?? 'USER', (v) => (selectedUser.role = v as UserRole)}
			required
			error={modalErrors.role}
		/>
		<Input
			label={modalMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
			type="password"
			bind:value={selectedUser.password}
			required
			error={modalErrors.password}
		/>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closeModal}>Cancel</Button>
		<Button variant="primary" loading={modalLoading} onclick={handleSave}>
			{modalMode === 'create' ? 'Create' : 'Save Changes'}
		</Button>
	{/snippet}
</Modal>

<Modal open={modalMode === 'detail'} title="User Details1" onclose={closeModal}>
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30">
				<span class="text-lg font-bold">{selectedUser.name?.charAt(0).toUpperCase()}</span>
			</div>
			<div>
				<h3 class="text-main text-lg font-semibold">{selectedUser.name}</h3>
			</div>
		</div>
		<div class="flex items-start gap-3">
			<Mail class="h-5 w-5 text-slate-400" />
			<div>
				<p class="text-muted text-sm">Email</p>
				<p class="text-main">{selectedUser.email}</p>
			</div>
		</div>
		<div class="flex items-start gap-3">
			<Shield class="h-5 w-5 text-slate-400" />
			<div>
				<p class="text-muted text-sm">Role</p>
				<p class="text-main">{roleLabel((selectedUser.role as UserRole) ?? 'USER')}</p>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closeModal}>Close</Button>
		<Button
			variant="primary"
			onclick={() => {
				const userId = selectedUser?.id;
				closeModal();
				const user = users.find((u) => u.id === userId);
				if (user) openEdit(user);
			}}
		>
			Edit
		</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	open={!!deleteId}
	title="Delete User"
	message="Are you sure you want to delete this user? This action cannot be undone."
	confirmText="Delete"
	loading={deleting}
	onconfirm={handleDelete}
	oncancel={() => (deleteId = null)}
/>
