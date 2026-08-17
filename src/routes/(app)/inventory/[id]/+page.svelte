<script lang="ts">
	import { ArrowLeft, Edit, Package, AlertTriangle } from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Button, DataTable } from '$lib/components/ui';
	import { formatDate, formatNumber, formatDateTime } from '$lib/utils/format';
	import { hasPermission } from '$lib/permissions';
	import type { StockTransaction } from '$lib/types';

	let { data } = $props();
	const product = $derived(data.product);
	const history = $derived<StockTransaction[]>(data.history ?? []);
	const canWrite = $derived(hasPermission(data.user.role, 'inventory:write'));

	const isLowStock = $derived(product.stock <= product.minimumStock);

	const historyColumns = [
		{ key: 'type', header: 'Type', cell: (tx: StockTransaction) => tx.type },
		{ key: 'qty', header: 'Qty', cell: (tx: StockTransaction) => formatNumber(tx.qty) },
		{
			key: 'stockBefore',
			header: 'Before',
			cell: (tx: StockTransaction) => formatNumber(tx.stockBefore)
		},
		{
			key: 'stockAfter',
			header: 'After',
			cell: (tx: StockTransaction) => formatNumber(tx.stockAfter)
		},
		{ key: 'note', header: 'Note', cell: (tx: StockTransaction) => tx.note || '-' },
		{
			key: 'createdAt',
			header: 'Date',
			cell: (tx: StockTransaction) => formatDateTime(tx.createdAt)
		}
	];
</script>

<div class="space-y-6">
	<Breadcrumb items={[{ label: 'Inventory', href: '/inventory' }, { label: product.name }]} />

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">{product.name}</h1>
			<p class="text-muted">Product details and stock information</p>
		</div>
		<div class="flex gap-3">
			<Button variant="secondary" href="/inventory">
				<ArrowLeft class="h-4 w-4" />
				Back
			</Button>
			{#if canWrite}
				<Button variant="primary" href="/inventory/{product.id}/edit">
					<Edit class="h-4 w-4" />
					Edit
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card class="lg:col-span-2" padding="lg">
			<div class="mb-6 flex items-start justify-between">
				<div class="flex items-center gap-4">
					<div class="rounded-2xl bg-primary-100 p-4 text-primary-700 dark:bg-primary-900/30">
						<Package class="h-8 w-8" />
					</div>
					<div>
						<h2 class="text-main text-xl font-semibold">{product.name}</h2>
						<p class="text-muted text-sm">{product.code}</p>
					</div>
				</div>
				<Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}
					>{product.status}</Badge
				>
			</div>

			<div class="grid gap-6 sm:grid-cols-2">
				<div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<p class="text-muted text-sm">Category</p>
					<p class="text-main text-lg font-semibold">{product.category?.name ?? '-'}</p>
				</div>
				<div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<p class="text-muted text-sm">Unit</p>
					<p class="text-main text-lg font-semibold">{product.unit}</p>
				</div>
				<div
					class="rounded-lg {isLowStock
						? 'dark:bg-danger-900/20 bg-danger-50'
						: 'bg-slate-50 dark:bg-slate-800/50'} p-4"
				>
					<div class="flex items-center gap-2">
						<p class="text-muted text-sm">Current Stock</p>
						{#if isLowStock}
							<AlertTriangle class="h-4 w-4 text-danger-500" />
						{/if}
					</div>
					<p class="text-lg font-semibold {isLowStock ? 'text-danger-600' : 'text-main'}">
						{formatNumber(product.stock)}
						{product.unit}
					</p>
				</div>
				<div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<p class="text-muted text-sm">Minimum Stock</p>
					<p class="text-main text-lg font-semibold">
						{formatNumber(product.minimumStock)}
						{product.unit}
					</p>
				</div>
			</div>
		</Card>

		<Card padding="lg">
			<h3 class="text-main mb-4 text-lg font-semibold">Information</h3>
			<div class="space-y-4 text-sm">
				<div class="flex justify-between">
					<span class="text-muted">Created</span>
					<span class="text-main">{formatDate(product.createdAt)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted">Last Updated</span>
					<span class="text-main">{formatDate(product.updatedAt)}</span>
				</div>
			</div>
		</Card>
	</div>

	<Card padding="lg">
		<h3 class="text-main mb-4 text-lg font-semibold">Recent Stock History</h3>
		{#if history.length === 0}
			<p class="text-muted text-sm">No stock movement recorded yet.</p>
		{:else}
			<DataTable columns={historyColumns} rows={history} />
		{/if}
	</Card>
</div>
