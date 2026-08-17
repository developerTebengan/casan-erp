<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertTriangle, ClipboardCheck, ShoppingCart } from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Spinner, Button } from '$lib/components/ui';
	import { formatCurrency, formatDate, formatNumber } from '$lib/utils/format';
	import { t } from '$lib/i18n';
	import { localeStore } from '$lib/stores/locale.svelte';
	import { isQueueOverdue } from '$lib/dashboard/home';
	import type { DashboardData, Purchase } from '$lib/types';

	let data = $state<DashboardData | null>(null);
	let loading = $state(true);
	const locale = $derived(localeStore.value);

	onMount(async () => {
		try {
			const res = await fetch('/api/dashboard');
			if (res.ok) {
				data = await res.json();
			}
		} finally {
			loading = false;
		}
	});

	function statusLabel(status: Purchase['approvalStatus']) {
		if (status === 'APPROVED') return 'Approved';
		if (status === 'REJECTED') return 'Unapproved';
		return 'Waiting';
	}

	function statusVariant(status: Purchase['approvalStatus']) {
		if (status === 'APPROVED') return 'success' as const;
		if (status === 'REJECTED') return 'danger' as const;
		return 'warning' as const;
	}
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: t('page.dashboard', locale) }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">{t('page.dashboard', locale)}</h1>
			{#if data}
				<p class="text-muted">
					{t(`dash.${data.home}`, locale)}
				</p>
			{/if}
		</div>
		{#if data}
			<div class="flex flex-wrap gap-2">
				{#if data.home === 'mine' && data.stats.lowStockItems > 0}
					<Button href="/purchasing/new?fromLowStock=1" variant="primary" size="sm">
						{t('dash.createPr', locale)}
					</Button>
				{/if}
				{#if data.home !== 'mine' && data.stats.lowStockItems > 0}
					<Button href="/inventory?lowStock=1" variant="secondary" size="sm">
						<AlertTriangle class="h-4 w-4" />
						{t('dash.lowStock', locale)}
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if loading || !data}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else if data.home === 'queue'}
		<Card padding="md">
			<div class="mb-4 flex items-center justify-between gap-3">
				<div>
					<h2 class="text-main text-lg font-semibold">{t('dash.queue', locale)}</h2>
					<p class="text-muted text-sm">{data.stats.pendingApprovals}</p>
				</div>
				<ClipboardCheck class="h-5 w-5 text-primary-600" />
			</div>
			{#if data.queue.length === 0}
				<p class="text-muted text-sm">{t('table.empty', locale)}</p>
			{:else}
				<ul class="divide-theme divide-y">
					{#each data.queue as row (row.id)}
						<li>
							<a
								href="/purchasing/{row.id}"
								class="flex items-center justify-between gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
							>
								<div class="min-w-0">
									<p class="text-main font-medium">{row.prNumber}</p>
									<p class="text-muted truncate text-sm">{row.purpose}</p>
								</div>
								<div class="shrink-0 text-right">
									<p
										class="text-sm {isQueueOverdue(row)
											? 'font-semibold text-danger-600'
											: 'text-muted'}"
									>
										{formatDate(row.decisionDeadline)}
									</p>
									<Badge variant={statusVariant(row.approvalStatus)}
										>{statusLabel(row.approvalStatus)}</Badge
									>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	{:else if data.home === 'mine'}
		<div class="grid gap-6 lg:grid-cols-2">
			<Card padding="md">
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="text-main text-lg font-semibold">{t('dash.mine', locale)}</h2>
					<ShoppingCart class="h-5 w-5 text-primary-600" />
				</div>
				{#if data.mine.length === 0}
					<p class="text-muted text-sm">{t('table.empty', locale)}</p>
				{:else}
					<ul class="divide-theme divide-y">
						{#each data.mine as row (row.id)}
							<li>
								<a
									href="/purchasing/{row.id}"
									class="flex items-center justify-between gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
								>
									<div class="min-w-0">
										<p class="text-main font-medium">{row.prNumber}</p>
										<p class="text-muted truncate text-sm">{row.purpose}</p>
									</div>
									<Badge variant={statusVariant(row.approvalStatus)}
										>{statusLabel(row.approvalStatus)}</Badge
									>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>

			<Card padding="md">
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="text-main text-lg font-semibold">{t('dash.lowStock', locale)}</h2>
					{#if data.stats.lowStockItems > 0}
						<Button href="/purchasing/new?fromLowStock=1" variant="secondary" size="sm">
							{t('dash.createPr', locale)}
						</Button>
					{/if}
				</div>
				{#if data.lowStockProducts.length === 0}
					<p class="text-muted text-sm">{t('table.empty', locale)}</p>
				{:else}
					<ul class="divide-theme divide-y">
						{#each data.lowStockProducts as product (product.id)}
							<li class="flex items-center justify-between gap-3 py-3">
								<div class="min-w-0">
									<p class="text-main font-medium">{product.name}</p>
									<p class="text-muted text-sm">{product.code} · {product.categoryName}</p>
								</div>
								<Badge variant="warning">
									{formatNumber(product.stock)} / {formatNumber(product.minimumStock)}
									{product.unit}
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			<a href="/inventory?lowStock=1" class="block transition hover:opacity-90">
				<Card padding="md">
					<p class="text-muted text-sm font-medium">{t('dash.lowStock', locale)}</p>
					<p class="text-main mt-1 text-2xl font-bold">{data.stats.lowStockItems}</p>
				</Card>
			</a>
			<a href="/purchasing" class="block transition hover:opacity-90">
				<Card padding="md">
					<p class="text-muted text-sm font-medium">PENDING</p>
					<p class="text-main mt-1 text-2xl font-bold">{data.stats.pendingPurchases}</p>
				</Card>
			</a>
		</div>

		<Card padding="md">
			<div class="mb-4">
				<h2 class="text-main text-lg font-semibold">{t('dash.ops', locale)}</h2>
			</div>
			{#if data.recentPurchases.length === 0}
				<p class="text-muted text-sm">{t('table.empty', locale)}</p>
			{:else}
				<ul class="divide-theme divide-y">
					{#each data.recentPurchases as row (row.id)}
						<li>
							<a
								href="/purchasing/{row.id}"
								class="flex items-center justify-between gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
							>
								<div class="min-w-0">
									<p class="text-main font-medium">{row.prNumber}</p>
									<p class="text-muted truncate text-sm">{formatDate(row.dateOfRequest)}</p>
								</div>
								<div class="shrink-0 text-right">
									<p class="text-main text-sm font-medium">{formatCurrency(row.total)}</p>
									<Badge variant={statusVariant(row.approvalStatus)}
										>{statusLabel(row.approvalStatus)}</Badge
									>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	{/if}
</div>
