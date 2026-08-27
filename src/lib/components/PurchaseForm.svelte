<script lang="ts">
	import { Button, Card, Input, SearchableSelect, Select, Textarea } from '$lib/components/ui';
	import type { Product, Purchase, PurchasePriority, Supplier, User } from '$lib/types';
	import { formatCurrency, formatNumber } from '$lib/utils/format';
	import { ExternalLink, Plus, Trash2 } from '@lucide/svelte';
	import { untrack } from 'svelte';

	interface Props {
		purchase?: Partial<Purchase>;
		suppliers: Supplier[];
		products: Product[];
		users: User[];
		errors?: Record<string, string>;
		loading?: boolean;
		submitLabel?: string;
		onsubmit: (data: Record<string, unknown>) => void;
	}

	let {
		purchase,
		suppliers,
		products,
		users,
		errors = {},
		loading = false,
		submitLabel = 'Save',
		onsubmit
	}: Props = $props();

	const isEdit = $derived(!!purchase?.id);

	let prNumber = $state(untrack(() => purchase?.prNumber ?? ''));
	let supplierId = $state(untrack(() => purchase?.supplierId ?? ''));
	let dateOfRequest = $state(
		untrack(() =>
			formatDateForInput(purchase?.dateOfRequest ? new Date(purchase.dateOfRequest) : new Date())
		)
	);
	let priority = $state<PurchasePriority>(untrack(() => purchase?.priority ?? 'MEDIUM'));
	let dateRequired = $state(
		untrack(() =>
			formatDateForInput(purchase?.dateRequired ? new Date(purchase.dateRequired) : getTomorrow())
		)
	);
	let decisionDeadline = $state(
		untrack(() =>
			formatDateForInput(
				purchase?.decisionDeadline
					? new Date(purchase.decisionDeadline)
					: purchase?.dateRequired
						? new Date(purchase.dateRequired)
						: getTomorrow()
			)
		)
	);
	let expectedDeliveryDate = $state(
		untrack(() =>
			purchase?.expectedDeliveryDate
				? formatDateForInput(new Date(purchase.expectedDeliveryDate))
				: ''
		)
	);
	let department = $state(untrack(() => purchase?.department ?? ''));
	let purpose = $state(untrack(() => purchase?.purpose ?? ''));
	let comments = $state(untrack(() => purchase?.comments ?? ''));
	let departmentHeadId = $state(untrack(() => purchase?.departmentHeadId ?? ''));
	let financeApproverId = $state(untrack(() => purchase?.financeApproverId ?? ''));
	let finalApproverId = $state(untrack(() => purchase?.finalApproverId ?? ''));
	let dateError = $state('');
	let items = $state(
		untrack(
			() =>
				purchase?.items?.map((item) => ({
					productId: item.productId,
					qty: item.qty,
					price: item.price,
					notes: item.notes ?? ''
				})) ?? [{ productId: '', qty: 1, price: 0, notes: '' }]
		)
	);
	let priceInputs = $state(
		untrack(() => items.map((item) => formatNumber(Number(item.price) || 0)))
	);

	const supplierOptions = $derived([
		{ value: '', label: 'No Supplier' },
		...suppliers.map((s) => ({ value: s.id, label: s.name }))
	]);
	const productOptions = $derived(
		products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))
	);
	const priorityOptions = $derived([
		{ value: 'LOW', label: 'Low' },
		{ value: 'MEDIUM', label: 'Medium' },
		{ value: 'HIGH', label: 'High' },
		{ value: 'URGENT', label: 'Urgent' }
	]);

	const departmentHeadOptions = $derived([
		{ value: '', label: 'Select Department Head' },
		...users
			.filter((u) => u.role === 'DEPARTMENT_HEAD')
			.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))
	]);

	const financeOptions = $derived([
		{ value: '', label: 'Select Finance' },
		...users
			.filter((u) => u.role === 'FINANCE')
			.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))
	]);

	const finalApproverOptions = $derived([
		{ value: '', label: 'Select Final Approval' },
		...users
			.filter((u) => u.role === 'MANAGER' || u.role === 'DIRECTOR')
			.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))
	]);

	const total = $derived(
		items.reduce((sum, item) => {
			const qty = Number(item.qty) || 0;
			const price = Number(item.price) || 0;
			return sum + qty * price;
		}, 0)
	);

	function formatDateForInput(date: Date) {
		return date.toISOString().split('T')[0];
	}

	function getTomorrow() {
		const date = new Date();
		date.setDate(date.getDate() + 1);
		return date;
	}

	function addItem() {
		items = [...items, { productId: '', qty: 1, price: 0, notes: '' }];
		priceInputs = [...priceInputs, '0'];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
		priceInputs = priceInputs.filter((_, i) => i !== index);
	}

	function updatePrice(index: number) {
		const item = items[index];
		const product = products.find((p) => p.id === item.productId);
		if (product && !item.price) {
			items[index] = { ...item, price: product.price };
			priceInputs[index] = formatNumber(product.price);
		}
	}

	function handlePriceInput(index: number, raw: string) {
		const numeric = Number(raw.replace(/\./g, '').replace(/,/g, '')) || 0;
		items[index] = { ...items[index], price: numeric };
	}

	function handlePriceBlur(index: number) {
		priceInputs[index] = formatNumber(Number(items[index].price) || 0);
	}

	function isDateValid() {
		return new Date(dateOfRequest) <= new Date(dateRequired);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!isDateValid()) {
			dateError = 'Date of Request cannot be later than Date Required';
			return;
		}
		if (new Date(decisionDeadline) < new Date(dateOfRequest)) {
			dateError = 'Decision deadline cannot be before Date of Request';
			return;
		}
		dateError = '';
		const data = {
			prNumber: isEdit ? prNumber : prNumber || undefined,
			supplierId: supplierId || null,
			dateOfRequest,
			priority,
			dateRequired,
			decisionDeadline,
			expectedDeliveryDate: expectedDeliveryDate || null,
			department,
			purpose,
			comments: comments || null,
			departmentHeadId: departmentHeadId || null,
			financeApproverId: financeApproverId || null,
			finalApproverId: finalApproverId || null,
			items: items
				.filter((item) => item.productId)
				.map((item) => ({
					productId: item.productId,
					qty: Number(item.qty),
					price: Number(item.price),
					notes: item.notes || undefined
				}))
		};
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
		{#if isEdit}
			<Input
				label="PR Number"
				name="prNumber"
				bind:value={prNumber}
				required
				error={errors.prNumber}
			/>
		{:else}
			<div>
				<p class="text-main mb-1.5 text-sm font-medium">PR Number</p>
				<div
					class="border-theme bg-slate-50 text-muted rounded-lg border px-4 py-2.5 text-sm dark:bg-slate-800/50"
				>
					Auto-generated on save (e.g. PR-202608-0001)
				</div>
				{#if errors.prNumber}
					<p class="mt-1 text-sm text-danger-500">{errors.prNumber}</p>
				{/if}
			</div>
		{/if}
		<div class="space-y-1">
			<Select
				label="Supplier (Optional)"
				name="supplierId"
				options={supplierOptions}
				bind:value={supplierId}
				error={errors.supplierId}
			/>
			<a
				href="/suppliers"
				target="_blank"
				class="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
			>
				Manage Suppliers
				<ExternalLink class="h-3 w-3" />
			</a>
		</div>
		<Input
			label="Date of Request"
			name="dateOfRequest"
			type="date"
			bind:value={dateOfRequest}
			max={dateRequired}
			required
			error={errors.dateOfRequest || dateError}
			oninput={() => (dateError = '')}
		/>
		<Select
			label="Priority"
			name="priority"
			options={priorityOptions}
			bind:value={priority}
			required
			error={errors.priority}
		/>
	</div>

	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<Input
			label="Department"
			name="department"
			bind:value={department}
			required
			error={errors.department}
		/>
		<Input
			label="Date Required (goods)"
			name="dateRequired"
			type="date"
			bind:value={dateRequired}
			min={dateOfRequest}
			required
			error={errors.dateRequired}
			oninput={() => (dateError = '')}
		/>
		<Input
			label="Decision deadline"
			name="decisionDeadline"
			type="date"
			bind:value={decisionDeadline}
			min={dateOfRequest}
			required
			error={errors.decisionDeadline || dateError}
			oninput={() => (dateError = '')}
		/>
		<Input
			label="Expected delivery"
			name="expectedDeliveryDate"
			type="date"
			bind:value={expectedDeliveryDate}
			error={errors.expectedDeliveryDate}
		/>
	</div>
	<p class="text-muted -mt-4 text-xs">
		Decision deadline is the latest date this PR should be approved or rejected (separate from when
		goods are needed). Expected delivery is optional planned arrival after approval.
	</p>

	<div>
		<Textarea
			label="Purpose / Reason for Request"
			name="purpose"
			bind:value={purpose}
			required
			error={errors.purpose}
			placeholder="Describe the purpose or reason for this request..."
		/>
	</div>

	<Card padding="md">
		<h3 class="text-main mb-4 text-lg font-semibold">Approval</h3>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<div class="space-y-1">
				<Select
					label="Department Head"
					name="departmentHeadId"
					options={departmentHeadOptions}
					bind:value={departmentHeadId}
					error={errors.departmentHeadId}
				/>
			</div>
			<div class="space-y-1">
				<Select
					label="Finance Department"
					name="financeApproverId"
					options={financeOptions}
					bind:value={financeApproverId}
					error={errors.financeApproverId}
				/>
			</div>
			<div class="space-y-1">
				<Select
					label="Final Approval"
					name="finalApproverId"
					options={finalApproverOptions}
					bind:value={finalApproverId}
					error={errors.finalApproverId}
				/>
			</div>
		</div>
		<a
			href="/users"
			target="_blank"
			class="mt-3 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
		>
			Manage Approval Users
			<ExternalLink class="h-3 w-3" />
		</a>
	</Card>

	<div>
		<Textarea
			label="Comments or Special Instructions"
			name="comments"
			bind:value={comments}
			error={errors.comments}
			placeholder="Any additional comments or special instructions..."
		/>
	</div>

	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h3 class="text-main text-lg font-semibold">Items</h3>
			<Button type="button" variant="secondary" size="sm" onclick={addItem}>
				<Plus class="h-4 w-4" />
				Add Item
			</Button>
		</div>

		{#if errors.items}
			<p class="text-sm text-danger-500">{errors.items}</p>
		{/if}

		<div class="space-y-3">
			{#each items as item, index}
				<div
					class="border-theme grid gap-3 rounded-lg border bg-slate-50 p-4 sm:grid-cols-12 sm:items-end dark:bg-slate-800/30"
				>
					<div class="sm:col-span-4">
						<SearchableSelect
							label="Product"
							options={productOptions}
							bind:value={item.productId}
							onchange={() => updatePrice(index)}
							placeholder="Search by code or name..."
							required
						/>
					</div>
					<div class="sm:col-span-2">
						<Input label="Qty" type="number" min="1" bind:value={item.qty} required />
					</div>
					<div class="sm:col-span-2">
						<Input
							label="Price"
							type="text"
							bind:value={priceInputs[index]}
							oninput={(e) => handlePriceInput(index, (e.target as HTMLInputElement).value)}
							onblur={() => handlePriceBlur(index)}
							required
						/>
					</div>
					<div class="sm:col-span-3">
						<Input label="Notes" bind:value={item.notes} placeholder="Item notes..." />
					</div>
					<div class="sm:col-span-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={() => removeItem(index)}
							class="text-danger-500 hover:text-danger-600"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="border-theme flex items-center justify-between border-t pt-6">
		<div>
			<p class="text-muted text-sm">Total Amount</p>
			<p class="text-2xl font-bold text-primary-600">{formatCurrency(total)}</p>
		</div>
		<div class="flex gap-3">
			<Button variant="secondary" href={isEdit && purchase?.id ? `/purchasing/${purchase.id}` : '/purchasing'}>
				Cancel
			</Button>
			<Button type="submit" variant="primary" {loading}>{submitLabel}</Button>
		</div>
	</div>
</form>
