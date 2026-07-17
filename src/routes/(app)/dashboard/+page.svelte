<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Package,
		ShoppingCart,
		Truck,
		AlertTriangle,
		TrendingUp,
		DollarSign
	} from '@lucide/svelte';
	import { Card, DataTable, Breadcrumb, Badge, Spinner } from '$lib/components/ui';
	import Chart from '$lib/components/ui/Chart.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { DashboardData, RecentActivity } from '$lib/types';

	let data = $state<DashboardData | null>(null);
	let loading = $state(true);

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

	const statCards = $derived([
		{
			label: 'Total Products',
			value: data?.stats.totalProducts ?? 0,
			icon: Package,
			color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30'
		},
		{
			label: 'Purchase Orders',
			value: data?.stats.totalPurchaseOrders ?? 0,
			icon: ShoppingCart,
			color: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30'
		},
		{
			label: 'Suppliers',
			value: data?.stats.totalSuppliers ?? 0,
			icon: Truck,
			color: 'bg-success-100 text-success-700 dark:bg-success-900/30'
		},
		{
			label: 'Low Stock Items',
			value: data?.stats.lowStockItems ?? 0,
			icon: AlertTriangle,
			color: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30'
		}
	]);

	const totalPurchaseValue = $derived(
		data?.monthlyPurchases.reduce((sum, item) => sum + item.total, 0) ?? 0
	);

	function typeBadge(row: RecentActivity) {
		const variant = row.type === 'PURCHASE' ? 'primary' : 'secondary';
		const label = row.type === 'PURCHASE' ? 'Purchase' : 'Product';
		const classes =
			variant === 'primary'
				? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
				: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${label}</span>`;
	}

	const activityColumns = [
		{ key: 'description', header: 'Activity' },
		{ key: 'type', header: 'Type', cell: typeBadge },
		{ key: 'date', header: 'Date', cell: (row: RecentActivity) => formatDate(row.date) }
	];
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Dashboard' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Dashboard</h1>
			<p class="text-muted">Overview of your business metrics</p>
		</div>
		<div
			class="border-theme bg-card text-muted flex items-center gap-2 rounded-lg border px-4 py-2 text-sm shadow-sm"
		>
			<TrendingUp class="h-4 w-4 text-success-500" />
			<span>System operational</span>
		</div>
	</div>

	{#if loading || !data}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each statCards as card}
				<Card padding="md">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-muted text-sm font-medium">{card.label}</p>
							<p class="text-main mt-1 text-2xl font-bold sm:text-3xl">
								{card.value.toLocaleString()}
							</p>
						</div>
						<div class="rounded-xl p-3 {card.color}">
							<card.icon class="h-6 w-6" />
						</div>
					</div>
				</Card>
			{/each}
		</div>

		<div class="grid gap-6 lg:grid-cols-3">
			<Card class="lg:col-span-2" padding="md">
				<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-main text-lg font-semibold">Monthly Purchases</h2>
						<p class="text-muted text-sm">Purchase trends over time</p>
					</div>
					<div class="text-left sm:text-right">
						<p class="text-muted text-sm">Total Value</p>
						<p class="text-lg font-bold text-primary-600">{formatCurrency(totalPurchaseValue)}</p>
					</div>
				</div>
				<Chart
					labels={data.monthlyPurchases.map((d) => d.month)}
					data={data.monthlyPurchases.map((d) => d.total)}
				/>
			</Card>

			<Card padding="md">
				<div class="mb-4">
					<h2 class="text-main text-lg font-semibold">Quick Stats</h2>
					<p class="text-muted text-sm">Additional insights</p>
				</div>
				<div class="space-y-4">
					<div
						class="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50"
					>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30">
								<DollarSign class="h-5 w-5" />
							</div>
							<span class="text-main text-sm font-medium">Avg. Purchase</span>
						</div>
						<span class="text-main font-semibold">
							{formatCurrency(
								data.stats.totalPurchaseOrders > 0
									? totalPurchaseValue / data.stats.totalPurchaseOrders
									: 0
							)}
						</span>
					</div>
					<div
						class="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50"
					>
						<div class="flex items-center gap-3">
							<div class="text-warning-700 dark:bg-warning-900/30 rounded-lg bg-warning-100 p-2">
								<AlertTriangle class="h-5 w-5" />
							</div>
							<span class="text-main text-sm font-medium">Stock Alerts</span>
						</div>
						<Badge variant={data.stats.lowStockItems > 0 ? 'warning' : 'success'}>
							{data.stats.lowStockItems} items
						</Badge>
					</div>
				</div>
			</Card>
		</div>

		<Card padding="md">
			<div class="mb-4">
				<h2 class="text-main text-lg font-semibold">Recent Activity</h2>
				<p class="text-muted text-sm">Latest updates across the system</p>
			</div>
			<DataTable columns={activityColumns} rows={data.recentActivities} />
		</Card>
	{/if}
</div>
