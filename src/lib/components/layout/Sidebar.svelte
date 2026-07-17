<script lang="ts">
	import {
		LayoutDashboard,
		Package,
		ShoppingCart,
		Settings,
		LogOut,
		ArrowLeftRight
	} from '@lucide/svelte';
	import { page } from '$app/stores';
	import { classNames } from '$lib/utils/format';
	import type { User } from '$lib/types';

	interface Props {
		user?: User | null;
		onlogout?: () => void;
	}

	let { user, onlogout }: Props = $props();

	const menuItems = [
		{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ label: 'Inventory', href: '/inventory', icon: Package },
		{ label: 'Stock Movement', href: '/stock', icon: ArrowLeftRight },
		{ label: 'Purchasing', href: '/purchasing', icon: ShoppingCart },
		{ label: 'Settings', href: '/settings', icon: Settings }
	];

	let currentPath = $derived($page.url.pathname);
</script>

<aside class="border-theme bg-card flex h-full w-64 flex-col border-r">
	<div class="border-theme flex h-16 items-center gap-3 border-b px-6">
		<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
			<Package class="h-5 w-5" />
		</div>
		<span class="text-main text-lg font-bold">Casan ERP</span>
	</div>

	<nav class="flex-1 space-y-1 p-4">
		{#each menuItems as item}
			{@const isActive = currentPath.startsWith(item.href)}
			<a
				href={item.href}
				class={classNames(
					'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
					isActive
						? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
				)}
			>
				<item.icon class="h-5 w-5" />
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
					<p class="text-muted truncate text-xs">{user.email}</p>
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
