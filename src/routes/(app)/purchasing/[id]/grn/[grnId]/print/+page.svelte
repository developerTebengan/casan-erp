<script lang="ts">
	import { ArrowLeft, Printer } from '@lucide/svelte';
	import { Button } from '$lib/components/ui';
	import { formatDateTime } from '$lib/utils/format';

	let { data } = $props();
	const receipt = $derived(data.receipt);
</script>

<svelte:head>
	<title>Goods Receipt {receipt.grnNumber}</title>
</svelte:head>

<div class="mx-auto max-w-4xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
	<div class="mb-6 flex items-center justify-between print:hidden">
		<Button variant="secondary" href="/purchasing/{receipt.purchaseId}">
			<ArrowLeft class="h-4 w-4" />
			Back
		</Button>
		<Button variant="primary" onclick={() => window.print()}>
			<Printer class="h-4 w-4" />
			Print
		</Button>
	</div>

	<div class="mb-8 flex items-start justify-between border-b-2 border-slate-800 pb-4">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Goods Receipt Note</h1>
			<p class="text-sm text-slate-600">GRN No: {receipt.grnNumber}</p>
		</div>
		<img src="/kop-casan.jpeg" alt="Casan Logo" class="h-20 w-auto object-contain" />
	</div>

	<section class="mb-6">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">Receipt Information</h2>
		<div class="grid grid-cols-2 gap-0 border border-slate-800 text-sm text-slate-800 md:grid-cols-3">
			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">GRN Number</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">{receipt.grnNumber}</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">PR Number</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{receipt.purchase?.prNumber ?? '-'}
			</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">Date</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{formatDateTime(receipt.createdAt)}
			</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">Supplier</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{receipt.purchase?.supplier?.name ?? '-'}
			</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">Warehouse</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{receipt.warehouse
					? `${receipt.warehouse.code} — ${receipt.warehouse.name}`
					: '-'}
			</div>

			<div class="border-r border-slate-300 bg-slate-50 p-2 font-semibold">Department</div>
			<div class="p-2 md:col-span-2">{receipt.purchase?.department ?? '-'}</div>
		</div>
	</section>

	<section class="mb-6">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">Received Items</h2>
		<table class="w-full border-collapse border border-slate-800 text-sm text-slate-800">
			<thead>
				<tr class="bg-slate-50">
					<th class="border border-slate-300 px-2 py-2 text-left">No</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Code</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Product</th>
					<th class="border border-slate-300 px-2 py-2 text-right">Qty</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Unit</th>
				</tr>
			</thead>
			<tbody>
				{#each receipt.lines ?? [] as line, index}
					<tr>
						<td class="border border-slate-300 px-2 py-2">{index + 1}</td>
						<td class="border border-slate-300 px-2 py-2">{line.product?.code ?? '-'}</td>
						<td class="border border-slate-300 px-2 py-2">{line.product?.name ?? '-'}</td>
						<td class="border border-slate-300 px-2 py-2 text-right">{line.qty}</td>
						<td class="border border-slate-300 px-2 py-2">{line.product?.unit ?? '-'}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="border border-slate-300 px-2 py-4 text-center text-slate-500">
							No lines
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	{#if receipt.note}
		<section class="mb-6 text-slate-800">
			<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">Note</h2>
			<div class="min-h-[3rem] border border-slate-800 p-3 text-sm">{receipt.note}</div>
		</section>
	{/if}

	<section class="mt-12 grid grid-cols-2 gap-8 text-sm text-slate-800">
		<div>
			<p class="mb-16 font-semibold">Received by</p>
			<div class="border-t border-slate-400 pt-1">Name / Signature</div>
		</div>
		<div>
			<p class="mb-16 font-semibold">Checked by</p>
			<div class="border-t border-slate-400 pt-1">Name / Signature</div>
		</div>
	</section>
</div>
