<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Menu, Sun, Moon, Bell } from '@lucide/svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { classNames, formatDateTime } from '$lib/utils/format';
	import type { AppNotification, User } from '$lib/types';

	interface Props {
		user?: User | null;
		class?: string;
	}

	let { user, class: className = '' }: Props = $props();

	let open = $state(false);
	let loading = $state(false);
	let notifications = $state<AppNotification[]>([]);
	let unreadCount = $state(0);

	async function loadNotifications() {
		if (!user) return;
		loading = true;
		try {
			const res = await fetch('/api/notifications?limit=15');
			if (res.ok) {
				const data = await res.json();
				notifications = data.data ?? [];
				unreadCount = data.unreadCount ?? 0;
			}
		} finally {
			loading = false;
		}
	}

	async function toggleOpen() {
		open = !open;
		if (open) await loadNotifications();
	}

	async function handleClick(n: AppNotification) {
		if (!n.readAt) {
			await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
			n.readAt = new Date().toISOString();
			unreadCount = Math.max(0, unreadCount - 1);
		}
		open = false;
		if (n.href) goto(n.href);
	}

	async function markAllRead() {
		await fetch('/api/notifications', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'markAllRead' })
		});
		notifications = notifications.map((n) => ({
			...n,
			readAt: n.readAt ?? new Date().toISOString()
		}));
		unreadCount = 0;
	}

	onMount(() => {
		if (user) loadNotifications();
		const onDocClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('[data-notif-root]')) open = false;
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});
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
		<h1 class="text-main text-lg font-semibold sm:text-xl">Casan ERP</h1>
	</div>

	<div class="flex items-center gap-2 sm:gap-4">
		<div class="relative" data-notif-root>
			<button
				type="button"
				class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
				aria-label="Notifications"
				aria-expanded={open}
				onclick={(e) => {
					e.stopPropagation();
					toggleOpen();
				}}
			>
				<Bell class="h-5 w-5" />
				{#if unreadCount > 0}
					<span
						class="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white"
					>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				{/if}
			</button>

			{#if open}
				<div
					class="border-theme bg-card absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg sm:w-96"
				>
					<div class="border-theme flex items-center justify-between border-b px-4 py-3">
						<p class="text-main text-sm font-semibold">Notifications</p>
						<div class="flex items-center gap-2">
							{#if unreadCount > 0}
								<button
									type="button"
									class="text-primary-600 hover:underline text-xs"
									onclick={markAllRead}
								>
									Mark all read
								</button>
							{/if}
							<a href="/notifications" class="text-muted hover:text-main text-xs" onclick={() => (open = false)}>
								View all
							</a>
						</div>
					</div>
					<div class="max-h-80 overflow-y-auto">
						{#if loading}
							<p class="text-muted px-4 py-6 text-center text-sm">Loading…</p>
						{:else if notifications.length === 0}
							<p class="text-muted px-4 py-6 text-center text-sm">No notifications yet.</p>
						{:else}
							{#each notifications as n (n.id)}
								<button
									type="button"
									class={classNames(
										'hover:bg-slate-50 dark:hover:bg-slate-800/60 w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 dark:border-slate-800',
										!n.readAt && 'bg-primary-50/50 dark:bg-primary-900/10'
									)}
									onclick={() => handleClick(n)}
								>
									<p class="text-main text-sm font-medium">{n.title}</p>
									<p class="text-muted mt-0.5 line-clamp-2 text-xs">{n.body}</p>
									<p class="text-muted mt-1 text-[11px]">{formatDateTime(n.createdAt)}</p>
								</button>
							{/each}
						{/if}
					</div>
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
					<p class="text-muted text-xs">{user.role}</p>
				</div>
			</div>
		{/if}
	</div>
</header>
