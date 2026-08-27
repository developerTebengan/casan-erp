<script lang="ts">
	import {
		LayoutDashboard,
		Package,
		Truck,
		ShoppingCart,
		Settings,
		Users,
		LogOut,
		ArrowLeftRight,
		ClipboardCheck,
		Inbox,
		Tags,
		Warehouse,
		ClipboardList,
		BarChart3
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import { classNames } from '$lib/utils/format';
	import { APP_VERSION } from '$lib/version';
	import { navItemsForRole } from '$lib/permissions';
	import type { User } from '$lib/types';
	import type { Component } from 'svelte';

	interface Props {
		user?: User | null;
		onlogout?: () => void;
	}

	let { user, onlogout }: Props = $props();

	const iconMap: Record<string, Component> = {
		'/dashboard': LayoutDashboard,
		'/inventory': Package,
		'/categories': Tags,
		'/stock': ArrowLeftRight,
		'/receiving': Inbox,
		'/cycle-counts': ClipboardList,
		'/warehouses': Warehouse,
		'/approvals': ClipboardCheck,
		'/purchasing': ShoppingCart,
		'/suppliers': Truck,
		'/reports': BarChart3,
		'/users': Users,
		'/settings': Settings
	};

	const menuItems = $derived(
		user ? navItemsForRole(user.role).map((item) => ({ ...item, icon: iconMap[item.href] })) : []
	);

	let currentPath = $derived($page.url.pathname);
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
				{item.label}
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
					<p class="text-muted truncate text-xs">{user.role.replaceAll('_', ' ')}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={onlogout}
				class="dark:text-danger-400 dark:hover:bg-danger-900/20 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50"
			>
				<LogOut class="h-4 w-4" />
				Logout
			</button>
		</div>
	{/if}
</aside>
