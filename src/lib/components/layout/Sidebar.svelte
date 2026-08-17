<script lang="ts">
	import {
		LayoutDashboard,
		Package,
		Truck,
		ShoppingCart,
		Settings,
		Users,
		LogOut,
		KeyRound,
		ArrowLeftRight,
		ClipboardCheck
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import { classNames } from '$lib/utils/format';
	import { APP_VERSION } from '$lib/version';
	import { navItemsForRole } from '$lib/permissions';
	import { t, roleLabel } from '$lib/i18n';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Button, Input, Modal } from '$lib/components/ui';
	import type { User } from '$lib/types';
	import type { Component } from 'svelte';

	interface Props {
		user?: User | null;
		waitingCount?: number;
		onlogout?: () => void;
	}

	let { user, waitingCount = 0, onlogout }: Props = $props();

	const iconMap: Record<string, Component> = {
		'/dashboard': LayoutDashboard,
		'/inventory': Package,
		'/stock': ArrowLeftRight,
		'/approvals': ClipboardCheck,
		'/purchasing': ShoppingCart,
		'/suppliers': Truck,
		'/users': Users,
		'/settings': Settings
	};

	const menuItems = $derived(
		user ? navItemsForRole(user.role).map((item) => ({ ...item, icon: iconMap[item.href] })) : []
	);

	let currentPath = $derived($page.url.pathname);

	let passwordOpen = $state(false);
	let passwordLoading = $state(false);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordErrors = $state<Record<string, string>>({});

	function closePasswordModal() {
		passwordOpen = false;
		passwordLoading = false;
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		passwordErrors = {};
	}

	async function submitPasswordChange() {
		passwordLoading = true;
		passwordErrors = {};
		try {
			const res = await fetch('/api/me/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
			});
			if (res.ok) {
				toastStore.success(t('password.changed', localeStore.value));
				closePasswordModal();
				return;
			}
			const errorData = await res.json().catch(() => ({}));
			passwordErrors = Object.fromEntries(
				Object.entries(errorData.errors || {}).map(([k, v]) => [
					k,
					Array.isArray(v) ? v[0] : String(v)
				])
			);
			if (errorData.message && Object.keys(passwordErrors).length === 0) {
				passwordErrors = { currentPassword: errorData.message };
			}
		} finally {
			passwordLoading = false;
		}
	}
</script>

<aside class="border-theme bg-card flex h-full w-64 flex-col border-r">
	<div class="border-theme flex h-16 items-center gap-3 border-b px-6">
		<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
			<Package class="h-5 w-5" />
		</div>
		<div class="min-w-0">
			<span class="text-main text-lg font-bold">Casan ERP</span>
			<p class="text-muted text-xs">v{APP_VERSION}</p>
		</div>
	</div>

	<nav class="flex-1 space-y-1 p-4">
		{#each menuItems as item}
			{@const isActive = currentPath.startsWith(item.href)}
			<a
				href={item.href}
				class={classNames(
					'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
					isActive
						? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-500'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
				)}
			>
				{#if item.icon}
					<item.icon class="h-5 w-5" />
				{/if}
				{t(item.labelKey, localeStore.value)}
				{#if item.href === '/approvals' && waitingCount > 0}
					<span
						class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-semibold text-white"
					>
						{waitingCount}
					</span>
				{/if}
			</a>
		{/each}
	</nav>

	{#if user}
		<div class="border-theme border-t p-4">
			<div class="mb-3 flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30"
				>
					<span class="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-main truncate text-sm font-medium">{user.name}</p>
					<p class="text-muted truncate text-xs">{roleLabel(user.role, localeStore.value)}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={() => (passwordOpen = true)}
				class="mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
			>
				<KeyRound class="h-4 w-4" />
				{t('password.change', localeStore.value)}
			</button>
			<button
				type="button"
				onclick={onlogout}
				class="dark:text-danger-400 dark:hover:bg-danger-900/20 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50"
			>
				<LogOut class="h-4 w-4" />
				{t('common.logout', localeStore.value)}
			</button>
		</div>
	{/if}
</aside>

<Modal
	open={passwordOpen}
	title={t('password.change', localeStore.value)}
	size="sm"
	onclose={closePasswordModal}
>
	<div class="space-y-4">
		<Input
			label={t('password.current', localeStore.value)}
			type="password"
			bind:value={currentPassword}
			required
			error={passwordErrors.currentPassword}
		/>
		<Input
			label={t('password.new', localeStore.value)}
			type="password"
			bind:value={newPassword}
			required
			error={passwordErrors.newPassword}
		/>
		<Input
			label={t('password.confirm', localeStore.value)}
			type="password"
			bind:value={confirmPassword}
			required
			error={passwordErrors.confirmPassword}
		/>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={closePasswordModal}>Cancel</Button>
		<Button variant="primary" loading={passwordLoading} onclick={submitPasswordChange}>
			{t('password.change', localeStore.value)}
		</Button>
	{/snippet}
</Modal>
