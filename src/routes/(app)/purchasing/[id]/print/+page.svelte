<script lang="ts">
	import { ArrowLeft, Printer } from '@lucide/svelte';
	import { Button } from '$lib/components/ui';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import type { Purchase, PurchaseItem, ApprovalStatus, User } from '$lib/types';

	let { data } = $props();
	const purchase = $derived(data.purchase as Purchase);

	function statusLabel(status: ApprovalStatus) {
		if (status === 'APPROVED') return 'Approved';
		if (status === 'REJECTED') return 'Rejected';
		return 'Pending';
	}

	function approverInfo(user?: User | null) {
		if (!user) return { name: '-', role: '-' };
		return { name: user.name, role: user.role };
	}

	function itemNo(index: number) {
		return index + 1;
	}

	function itemNotes(item: PurchaseItem) {
		return item.notes || '-';
	}

	const approvals = $derived([
		{
			label: 'Department Head',
			...approverInfo(purchase.departmentHead),
			status: purchase.departmentHeadStatus,
			date: purchase.departmentHeadApprovedAt
		},
		{
			label: 'Finance Department',
			...approverInfo(purchase.financeApprover),
			status: purchase.financeStatus,
			date: purchase.financeApprovedAt
		},
		{
			label: 'Final Approval',
			...approverInfo(purchase.finalApprover),
			status: purchase.finalStatus,
			date: purchase.finalApprovedAt
		}
	]);
</script>

<svelte:head>
	<title>Purchase Request Form</title>
</svelte:head>

<div class="mx-auto max-w-4xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
	<!-- Screen-only toolbar -->
	<div class="mb-6 flex items-center justify-between print:hidden">
		<Button variant="secondary" href="/purchasing/{purchase.id}">
			<ArrowLeft class="h-4 w-4" />
			Back
		</Button>
		<Button variant="primary" onclick={() => window.print()}>
			<Printer class="h-4 w-4" />
			Print
		</Button>
	</div>

	<!-- Header / Kop -->
	<div class="mb-8 flex items-start justify-between border-b-2 border-slate-800 pb-4">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Purchase Request Form</h1>
			<p class="text-sm text-slate-600">PR No: {purchase.prNumber}</p>
		</div>
		<img src="/kop-casan.jpeg" alt="Casan Logo" class="h-20 w-auto object-contain" />
	</div>

	<!-- Request Information -->
	<section class="mb-6">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">
			Request Information
		</h2>
		<div
			class="grid grid-cols-2 gap-0 border border-slate-800 text-sm text-slate-800 md:grid-cols-3"
		>
			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">PR Number</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">{purchase.prNumber}</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">
				Date of Request
			</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{formatDate(purchase.dateOfRequest)}
			</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">Priority</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">{purchase.priority}</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">Department</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">{purchase.department}</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">
				Requested By
			</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{purchase.requester?.name ?? '-'}
			</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">
				Date Required
			</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{formatDate(purchase.dateRequired)}
			</div>

			<div class="border-r border-slate-300 bg-slate-50 p-2 font-semibold">Overall Status</div>
			<div class="p-2 md:col-span-2">{statusLabel(purchase.approvalStatus)}</div>
		</div>
	</section>

	<!-- Supplier Information -->
	<section class="mb-6">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">
			Supplier Information
		</h2>
		<div
			class="grid grid-cols-2 gap-0 border border-slate-800 text-sm text-slate-800 md:grid-cols-3"
		>
			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">
				Supplier Name
			</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{purchase.supplier?.name ?? 'Not specified'}
			</div>

			<div class="border-r border-b border-slate-300 bg-slate-50 p-2 font-semibold">Phone</div>
			<div class="border-b border-slate-300 p-2 md:col-span-2">
				{purchase.supplier?.phone ?? '-'}
			</div>

			<div class="border-r border-slate-300 bg-slate-50 p-2 font-semibold">Address</div>
			<div class="p-2 md:col-span-2">{purchase.supplier?.address ?? '-'}</div>
		</div>
	</section>

	<!-- Items -->
	<section class="mb-6">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">Items</h2>
		<table class="w-full border-collapse border border-slate-800 text-sm text-slate-800">
			<thead>
				<tr class="bg-slate-50">
					<th class="border border-slate-300 px-2 py-2 text-left">No</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Product</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Qty</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Unit</th>
					<th class="border border-slate-300 px-2 py-2 text-right">Price</th>
					<th class="border border-slate-300 px-2 py-2 text-right">Subtotal</th>
					<th class="border border-slate-300 px-2 py-2 text-left">Notes</th>
				</tr>
			</thead>
			<tbody>
				{#each purchase.items ?? [] as item, index (item.id)}
					<tr>
						<td class="border border-slate-300 px-2 py-2">{itemNo(index)}</td>
						<td class="border border-slate-300 px-2 py-2">
							{item.product?.name ?? '-'}
						</td>
						<td class="border border-slate-300 px-2 py-2 text-right">{item.qty}</td>
						<td class="border border-slate-300 px-2 py-2">{item.product?.unit ?? '-'}</td>
						<td class="border border-slate-300 px-2 py-2 text-right">
							{formatCurrency(item.price)}
						</td>
						<td class="border border-slate-300 px-2 py-2 text-right">
							{formatCurrency(item.subtotal)}
						</td>
						<td class="border border-slate-300 px-2 py-2">{itemNotes(item)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="border border-slate-300 px-2 py-4 text-center text-slate-500">
							No items
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="bg-slate-50 font-semibold">
					<td colspan="5" class="border border-slate-300 px-2 py-2 text-right">Total</td>
					<td colspan="2" class="border border-slate-300 px-2 py-2">
						{formatCurrency(purchase.total)}
					</td>
				</tr>
			</tfoot>
		</table>
	</section>

	<!-- Purpose / Reason -->
	<section class="mb-6 text-slate-800">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">
			Purpose / Reason for Request
		</h2>
		<div class="min-h-[4rem] border border-slate-800 p-3 text-sm">
			{purchase.purpose || '-'}
		</div>
	</section>

	<!-- Approvals -->
	<section class="mb-6 text-slate-800">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">Approvals</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each approvals as approval (approval.label)}
				<div class="flex flex-col justify-between border border-slate-800 p-3 text-sm">
					<p class="mb-3 font-bold text-slate-800">{approval.label}</p>
					<div class="space-y-2">
						<div>
							<span class="block text-xs text-slate-500">Name</span>
							<span class="font-medium">{approval.name}</span>
						</div>
						<div>
							<span class="block text-xs text-slate-500">Position</span>
							<span class="font-medium">{approval.role}</span>
						</div>
						<div>
							<span class="block text-xs text-slate-500">Status</span>
							<span class="font-medium">{statusLabel(approval.status)}</span>
						</div>
						<div>
							<span class="block text-xs text-slate-500">Date</span>
							<span class="font-medium">
								{approval.date ? formatDate(approval.date) : '________________'}
							</span>
						</div>
					</div>
					<div class="mt-6">
						<span class="block text-xs text-slate-500">Signature</span>
						<div class="mt-6 border-t border-slate-400 pt-1 text-xs text-slate-500">&nbsp;</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Comments / Special Instructions -->
	<section class="mb-6 text-slate-800">
		<h2 class="mb-2 text-sm font-bold tracking-wide text-slate-800 uppercase">
			Comments or Special Instructions
		</h2>
		<div class="min-h-[4rem] border border-slate-800 p-3 text-sm">
			{purchase.comments || '-'}
		</div>
	</section>
</div>
