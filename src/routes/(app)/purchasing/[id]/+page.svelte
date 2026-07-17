<script lang="ts">
	import { ArrowLeft, FileText, Truck, Calendar } from '@lucide/svelte';
	import { Card, Breadcrumb, Badge, Button, DataTable } from '$lib/components/ui';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { PurchaseItem } from '$lib/types';

	let { data } = $props();
	const purchase = $derived(data.purchase);

	const itemColumns = [
		{ key: 'product', header: 'Product', cell: (item: PurchaseItem) => item.product?.name ?? '-' },
		{
			key: 'qty',
			header: 'Quantity',
			cell: (item: PurchaseItem) => `${item.qty} ${item.product?.unit ?? ''}`
		},
		{ key: 'price', header: 'Price', cell: (item: PurchaseItem) => formatCurrency(item.price) },
		{
			key: 'subtotal',
			header: 'Subtotal',
			cell: (item: PurchaseItem) => formatCurrency(item.subtotal)
		}
	];
</script>

<div class="space-y-6">
	<Breadcrumb
		items={[{ label: 'Purchasing', href: '/purchasing' }, { label: purchase.poNumber }]}
	/>

	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-main text-2xl font-bold sm:text-3xl">{purchase.poNumber}</h1>
			<p class="text-muted">Purchase order details</p>
		</div>
		<div class="flex gap-3">
			<Button variant="secondary" href="/purchasing">
				<ArrowLeft class="h-4 w-4" />
				Back
			</Button>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<Card class="lg:col-span-2" padding="lg">
			<div class="mb-6 flex items-start justify-between">
				<div class="flex items-center gap-4">
					<div class="rounded-2xl bg-primary-100 p-4 text-primary-700 dark:bg-primary-900/30">
						<FileText class="h-8 w-8" />
					</div>
					<div>
						<h2 class="text-main text-xl font-semibold">{purchase.poNumber}</h2>
						<p class="text-muted text-sm">{formatDate(purchase.purchaseDate)}</p>
					</div>
				</div>
				<Badge
					variant={purchase.status === 'RECEIVED'
						? 'success'
						: purchase.status === 'CANCELLED'
							? 'danger'
							: purchase.status === 'ORDERED'
								? 'primary'
								: 'secondary'}
				>
					{purchase.status}
				</Badge>
			</div>

			<div class="mb-6 grid gap-4 sm:grid-cols-2">
				<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<div class="text-accent-700 dark:bg-accent-900/30 rounded-lg bg-accent-100 p-2">
						<Truck class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Supplier</p>
						<p class="text-main font-semibold">{purchase.supplier?.name ?? '-'}</p>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
					<div class="text-warning-700 dark:bg-warning-900/30 rounded-lg bg-warning-100 p-2">
						<Calendar class="h-5 w-5" />
					</div>
					<div>
						<p class="text-muted text-sm">Order Date</p>
						<p class="text-main font-semibold">{formatDate(purchase.purchaseDate)}</p>
					</div>
				</div>
			</div>

			<h3 class="text-main mb-4 text-lg font-semibold">Items</h3>
			<DataTable columns={itemColumns} rows={purchase.items ?? []} />

			<div class="border-theme mt-6 flex justify-end border-t pt-4">
				<div class="text-right">
					<p class="text-muted text-sm">Total Amount</p>
					<p class="text-2xl font-bold text-primary-600">{formatCurrency(purchase.total)}</p>
				</div>
			</div>
		</Card>

		<Card padding="lg">
			<h3 class="text-main mb-4 text-lg font-semibold">Order Summary</h3>
			<div class="space-y-4 text-sm">
				<div class="flex justify-between">
					<span class="text-muted">PO Number</span>
					<span class="text-main font-medium">{purchase.poNumber}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted">Supplier</span>
					<span class="text-main font-medium">{purchase.supplier?.name ?? '-'}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted">Status</span>
					<Badge
						variant={purchase.status === 'RECEIVED'
							? 'success'
							: purchase.status === 'CANCELLED'
								? 'danger'
								: purchase.status === 'ORDERED'
									? 'primary'
									: 'secondary'}
					>
						{purchase.status}
					</Badge>
				</div>
				<div class="flex justify-between">
					<span class="text-muted">Items</span>
					<span class="text-main font-medium">{purchase.items?.length ?? 0}</span>
				</div>
				<div class="border-theme border-t pt-4">
					<div class="flex justify-between">
						<span class="text-muted">Total</span>
						<span class="text-lg font-bold text-primary-600">{formatCurrency(purchase.total)}</span>
					</div>
				</div>
			</div>
		</Card>
	</div>
</div>
