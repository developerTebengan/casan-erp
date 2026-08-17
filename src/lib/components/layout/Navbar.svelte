<script lang="ts">
	import { Menu, Sun, Moon, Bell } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { classNames } from '$lib/utils/format';
	import { page } from '$app/stores';
	import { pageTitleKey, roleLabel, t } from '$lib/i18n';
	import type { User } from '$lib/types';

	interface NotificationItem {
		id: string;
		titleKey: string;
		params: Record<string, string>;
		href: string;
		readAt: string | null;
	}

	interface Props {
		user?: User | null;
		unreadCount?: number;
		waitingCount?: number;
		class?: string;
	}

	let {
		user,
		unreadCount = 0,
		waitingCount: _waitingCount = 0,
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let items = $state<NotificationItem[]>([]);
	let loading = $state(false);
	let badgeCount = $state(unreadCount);

	$effect(() => {
		badgeCount = unreadCount;
	});

	async function togglePanel() {
		open = !open;
		if (!open) return;
		loading = true;
		try {
			const res = await fetch('/api/notifications');
			if (!res.ok) {
				items = [];
				return;
			}
			items = (await res.json()) as NotificationItem[];
		} catch {
			items = [];
		} finally {
			loading = false;
		}
	}

	async function openNotification(item: NotificationItem) {
		const res = await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
		if (res.ok) {
			if (!item.readAt) {
				badgeCount = Math.max(0, badgeCount - 1);
			}
			items = items.map((n) =>
				n.id === item.id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n
			);
		}
		open = false;
		await goto(item.href);
	}
</script>

<header
	class={classNames(
		'border-theme bg-card/80 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur-md sm:px-6 lg:px-8',
		className
	)}
>
	<div class="flex items-center gap-4">
		<button
			type="button"
			class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
			onclick={() => sidebarStore.open()}
			aria-label="Open menu"
		>
			<Menu class="h-5 w-5" />
		</button>
		<h1 class="text-main text-lg font-semibold sm:text-xl">
			{t(pageTitleKey($page.url.pathname), localeStore.value)}
		</h1>
	</div>

	<div class="flex items-center gap-2 sm:gap-4">
		<div class="border-theme flex rounded-lg border text-xs font-semibold">
			<button
				type="button"
				class={localeStore.value === 'id'
					? 'bg-primary-50 px-2 py-1 text-primary-700'
					: 'text-muted px-2 py-1'}
				onclick={() => localeStore.set('id')}
			>
				ID
			</button>
			<button
				type="button"
				class={localeStore.value === 'en'
					? 'bg-primary-50 px-2 py-1 text-primary-700'
					: 'text-muted px-2 py-1'}
				onclick={() => localeStore.set('en')}
			>
				EN
			</button>
		</div>
		<div class="relative">
			<button
				type="button"
				class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
				aria-label={t('notify.bell', localeStore.value)}
				aria-expanded={open}
				onclick={togglePanel}
			>
				<Bell class="h-5 w-5" />
				{#if badgeCount > 0}
					<span
						class="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white"
					>
						{badgeCount}
					</span>
				{/if}
			</button>
			{#if open}
				<div
					class="border-theme bg-card absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg"
				>
					{#if loading}
						<p class="text-muted px-4 py-6 text-center text-sm">…</p>
					{:else if items.length === 0}
						<p class="text-muted px-4 py-6 text-center text-sm">
							{t('notify.empty', localeStore.value)}
						</p>
					{:else}
						<ul class="max-h-96 overflow-y-auto">
							{#each items as n (n.id)}
								<li>
									<button
										type="button"
										class={classNames(
											'w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
											n.readAt ? 'text-muted' : 'text-main font-medium'
										)}
										onclick={() => openNotification(n)}
									>
										{t(n.titleKey, localeStore.value, n.params)}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
		<button
			type="button"
			class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
			onclick={() => themeStore.toggle()}
			aria-label="Toggle theme"
		>
			{#if themeStore.value === 'dark'}
				<Sun class="h-5 w-5" />
			{:else}
				<Moon class="h-5 w-5" />
			{/if}
		</button>
		{#if user}
			<div class="hidden items-center gap-3 sm:flex">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30"
				>
					<span class="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
				</div>
				<div class="hidden md:block">
					<p class="text-main text-sm font-medium">{user.name}</p>
					<p class="text-muted text-xs">{roleLabel(user.role, localeStore.value)}</p>
				</div>
			</div>
		{/if}
	</div>
</header>
