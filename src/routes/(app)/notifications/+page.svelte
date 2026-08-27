<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Breadcrumb, Button, Card, EmptyState, Spinner } from '$lib/components/ui';
	import { formatDateTime, classNames } from '$lib/utils/format';
	import type { AppNotification } from '$lib/types';

	let notifications = $state<AppNotification[]>([]);
	let unreadCount = $state(0);
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/notifications?limit=100');
			if (res.ok) {
				const data = await res.json();
				notifications = data.data ?? [];
				unreadCount = data.unreadCount ?? 0;
			}
		} finally {
			loading = false;
		}
	}

	async function markAllRead() {
		await fetch('/api/notifications', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'markAllRead' })
		});
		await load();
	}

	async function openNotification(n: AppNotification) {
		if (!n.readAt) {
			await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
		}
		if (n.href) goto(n.href);
		else await load();
	}

	onMount(load);
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Notifications' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Notifications</h1>
			<p class="text-muted">
				{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
			</p>
		</div>
		{#if unreadCount > 0}
			<Button variant="secondary" onclick={markAllRead}>Mark all as read</Button>
		{/if}
	</div>

	{#if loading}
		<div class="flex h-48 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if notifications.length === 0}
		<EmptyState title="No notifications" description="Approvals and PR updates will show up here." />
	{:else}
		<Card padding="none">
			<ul class="divide-theme divide-y">
				{#each notifications as n (n.id)}
					<li>
						<button
							type="button"
							class={classNames(
								'hover:bg-slate-50 dark:hover:bg-slate-800/40 w-full px-4 py-4 text-left sm:px-6',
								!n.readAt && 'bg-primary-50/40 dark:bg-primary-900/10'
							)}
							onclick={() => openNotification(n)}
						>
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-main font-medium">{n.title}</p>
									<p class="text-muted mt-1 text-sm">{n.body}</p>
									<p class="text-muted mt-2 text-xs">{formatDateTime(n.createdAt)}</p>
								</div>
								{#if !n.readAt}
									<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500"></span>
								{/if}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</div>
