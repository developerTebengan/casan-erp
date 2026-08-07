<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Package,
		ShoppingCart,
		Truck,
		AlertTriangle,
		DollarSign,
		ClipboardCheck
	} from '@lucide/svelte';
	import { Card, DataTable, Breadcrumb, Badge, Spinner, Button } from '$lib/components/ui';
	import Chart from '$lib/components/ui/Chart.svelte';
	import { formatCurrency, formatDate, formatNumber } from '$lib/utils/format';
	import type {
		CategoryStockStat,
		DashboardData,
		DashboardProductRow,
		RecentActivity
	} from '$lib/types';

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
			color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30',
			href: '/inventory'
		},
		{
			label: 'Purchasing Requests',
			value: data?.stats.totalPurchaseOrders ?? 0,
			icon: ShoppingCart,
			color: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30',
			href: '/purchasing'
		},
		{
			label: 'Suppliers',
			value: data?.stats.totalSuppliers ?? 0,
			icon: Truck,
			color: 'bg-success-100 text-success-700 dark:bg-success-900/30',
			href: '/suppliers'
		},
		{
			label: 'Low Stock Items',
			value: data?.stats.lowStockItems ?? 0,
			icon: AlertTriangle,
			color: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30',
			href: '/inventory?lowStock=1'
		}
	]);

	const totalPurchaseValue = $derived(
		data?.monthlyPurchases.reduce((sum, item) => sum + item.total, 0) ?? 0
	);

	function typeBadge(row: RecentActivity) {
		const label = row.type === 'PURCHASE' ? 'Purchase' : 'Product';
		const classes =
			row.type === 'PURCHASE'
				? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
				: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${label}</span>`;
	}

	const activityColumns = [
		{ key: 'description', header: 'Activity' },
		{ key: 'type', header: 'Type', cell: typeBadge },
		{ key: 'date', header: 'Date', cell: (row: RecentActivity) => formatDate(row.date) }
	];

	function categoryStockCell(row: CategoryStockStat) {
		const low =
			row.lowStockCount > 0
				? `<span class="ml-2 text-xs text-danger-600">${row.lowStockCount} low</span>`
				: '';
		return `${formatNumber(row.totalStock)}${low}`;
	}

	const categoryColumns = [
		{ key: 'categoryName', header: 'Category / Type' },
		{ key: 'productCount', header: 'Products' },
		{ key: 'stock', header: 'Total stock', cell: categoryStockCell },
		{
			key: 'value',
			header: 'Inventory value',
			cell: (row: CategoryStockStat) => formatCurrency(row.inventoryValue)
		}
	];

	function productPhotoCell(row: DashboardProductRow) {
		if (row.imageUrl) {
			return `<img src="${row.imageUrl}" alt="" class="h-8 w-8 rounded object-cover" />`;
		}
		return `<span class="text-slate-400 text-xs">—</span>`;
	}

	function productStockCell(row: DashboardProductRow) {
		const isLow = row.stock <= row.minimumStock;
		const classes = isLow
			? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-600'
			: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-600';
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}">${formatNumber(row.stock)} ${row.unit}</span>`;
	}

	const productColumns = [
		{ key: 'photo', header: '', cell: productPhotoCell },
		{ key: 'code', header: 'Code' },
		{ key: 'name', header: 'Product' },
		{ key: 'categoryName', header: 'Category' },
		{ key: 'stock', header: 'Inventory', cell: productStockCell }
	];

	const categoryChartLabels = $derived(data?.categoryStock.map((c) => c.categoryName) ?? []);
	const categoryChartData = $derived(data?.categoryStock.map((c) => c.totalStock) ?? []);
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Dashboard' }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">Dashboard</h1>
			<p class="text-muted">Overview of your business metrics</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if (data?.stats.pendingApprovals ?? 0) > 0}
				<Button href="/approvals" variant="secondary" size="sm">
					<ClipboardCheck class="h-4 w-4" />
					{data?.stats.pendingApprovals} awaiting approval
				</Button>
			{/if}
			{#if (data?.stats.lowStockItems ?? 0) > 0}
				<Button href="/purchasing/new?fromLowStock=1" variant="secondary" size="sm">
					<AlertTriangle class="h-4 w-4" />
					Create PR from low stock
				</Button>
			{/if}
		</div>
	</div>

	{#if loading || !data}
		<div class="flex h-64 items-center justify-center">
			<Spinner size="lg" />
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each statCards as card}
				<a href={card.href} class="block transition hover:opacity-90">
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
				</a>
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
					<a
						href="/inventory?lowStock=1"
						class="flex items-center justify-between rounded-lg bg-slate-50 p-4 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
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
					</a>
					{#if data.stats.pendingApprovals > 0}
						<a
							href="/approvals"
							class="flex items-center justify-between rounded-lg bg-slate-50 p-4 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
						>
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-primary-100 p-2 text-primary-700 dark:bg-primary-900/30">
									<ClipboardCheck class="h-5 w-5" />
								</div>
								<span class="text-main text-sm font-medium">My Approvals</span>
							</div>
							<Badge variant="warning">{data.stats.pendingApprovals}</Badge>
						</a>
					{/if}
				</div>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card padding="md">
				<div class="mb-4">
					<h2 class="text-main text-lg font-semibold">Category stock analytics</h2>
					<p class="text-muted text-sm">Stock levels by product type / category</p>
				</div>
				{#if data.categoryStock.length === 0}
					<p class="text-muted text-sm">No categories yet.</p>
				{:else}
					<Chart labels={categoryChartLabels} data={categoryChartData} />
					<div class="mt-4">
						<DataTable columns={categoryColumns} rows={data.categoryStock} />
					</div>
				{/if}
			</Card>

			<Card padding="md">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h2 class="text-main text-lg font-semibold">Products & inventory</h2>
						<p class="text-muted text-sm">Category, name, and current stock</p>
					</div>
					<Button href="/inventory" variant="secondary" size="sm">View all</Button>
				</div>
				{#if data.productsByCategory.length === 0}
					<p class="text-muted text-sm">No products yet.</p>
				{:else}
					<DataTable columns={productColumns} rows={data.productsByCategory} />
				{/if}
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
