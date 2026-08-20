<script lang="ts">
	import { Button, Card, Input, Select, Textarea, Combobox } from '$lib/components/ui';
	import { DEPARTMENTS, PURPOSES } from '$lib/purchasing/catalog';
	import type { Product, Purchase, PurchasePriority, Supplier, User } from '$lib/types';
	import { formatCurrency, formatNumber, parseIdNumber } from '$lib/utils/format';
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

	let prNumber = $state(untrack(() => purchase?.prNumber ?? ''));
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
	let department = $state(untrack(() => purchase?.department ?? ''));
	let purpose = $state(untrack(() => purchase?.purpose ?? ''));
	let comments = $state(untrack(() => purchase?.comments ?? ''));
	let departmentHeadId = $state(untrack(() => purchase?.departmentHeadId ?? ''));
	let financeApproverId = $state(untrack(() => purchase?.financeApproverId ?? ''));
	let finalApproverId = $state(untrack(() => purchase?.finalApproverId ?? ''));
	let dateError = $state('');
	let tax = $state(untrack(() => formatNumber(Number(purchase?.tax ?? 0))));
	let shipping = $state(untrack(() => formatNumber(Number(purchase?.shipping ?? 0))));
	let otherFees = $state(untrack(() => formatNumber(Number(purchase?.otherFees ?? 0))));
	let items = $state(
		untrack(
			() =>
				purchase?.items?.map((item) => ({
					productId: item.productId,
					qty: item.qty,
					price: item.price,
					notes: item.notes ?? '',
					supplierId: item.supplierId ?? ''
				})) ?? [{ productId: '', qty: 1, price: 0, notes: '', supplierId: '' }]
		)
	);
	let priceInputs = $state(
		untrack(() => items.map((item) => formatNumber(Number(item.price) || 0)))
	);

	const lineSupplierOptions = $derived(
		suppliers.map((s) => ({ value: s.id, label: s.name }))
	);
	const productOptions = $derived(
		products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))
	);
	const departmentOptions = $derived([
		{ value: '', label: 'Select department' },
		...DEPARTMENTS.map((name) => ({ value: name, label: name })),
		...(department && !(DEPARTMENTS as readonly string[]).includes(department)
			? [{ value: department, label: department }]
			: [])
	]);
	const purposeOptions = $derived([
		{ value: '', label: 'Select purpose' },
		...PURPOSES.map((name) => ({ value: name, label: name })),
		...(purpose && !(PURPOSES as readonly string[]).includes(purpose)
			? [{ value: purpose, label: purpose }]
			: [])
	]);
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

	const lineTotal = $derived(
		items.reduce((sum, item) => {
			const qty = Number(item.qty) || 0;
			const price = Number(item.price) || 0;
			return sum + qty * price;
		}, 0)
	);
	const grandTotal = $derived(
		lineTotal + (Number(tax) || 0) + (Number(shipping) || 0) + (Number(otherFees) || 0)
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
		items = [...items, { productId: '', qty: 1, price: 0, notes: '', supplierId: '' }];
		priceInputs = [...priceInputs, '0'];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
		priceInputs = priceInputs.filter((_, i) => i !== index);
	}

	function updatePrice(index: number) {
		const item = items[index];
		const product = products.find((p) => p.id === item.productId);
		const next = { ...item };
		if (product && !item.price) {
			next.price = product.price;
			priceInputs[index] = formatNumber(product.price);
		}
		if (!item.supplierId && product?.suppliers?.[0]) {
			next.supplierId = product.suppliers[0].id;
		}
		items[index] = next;
	}

	function handlePriceInput(index: number, raw: string) {
		const numeric = parseIdNumber(raw);
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
			supplierId: null,
			dateOfRequest,
			priority,
			dateRequired,
			decisionDeadline,
			department,
			purpose,
			comments: comments || null,
			departmentHeadId: departmentHeadId || null,
			financeApproverId: financeApproverId || null,
			finalApproverId: finalApproverId || null,
			tax: parseIdNumber(tax),
			shipping: parseIdNumber(shipping),
			otherFees: parseIdNumber(otherFees),
			items: items
				.filter((item) => item.productId)
				.map((item) => ({
					productId: item.productId,
					qty: Number(item.qty),
					price: Number(item.price),
					notes: item.notes || undefined,
					supplierId: item.supplierId || null
				}))
		};
		onsubmit(data);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<Input
			label="PR Number"
			name="prNumber"
			value={prNumber || 'Assigned on save'}
			disabled
			error={errors.prNumber}
		/>
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

	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<Select
			label="Department"
			name="department"
			options={departmentOptions}
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
	</div>
	<p class="text-muted -mt-4 text-xs">
		Decision deadline is the latest date this PR should be approved or rejected (separate from when
		goods are needed).
	</p>

	<div>
		<Select
			label="Purpose"
			name="purpose"
			options={purposeOptions}
			bind:value={purpose}
			required
			error={errors.purpose}
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
					<div class="sm:col-span-3">
						<Combobox
							label="Product"
							options={productOptions}
							bind:value={item.productId}
							onchange={() => updatePrice(index)}
							required
							placeholder="Search product"
						/>
					</div>
					<div class="sm:col-span-3">
						<Combobox
							label="Supplier"
							options={lineSupplierOptions}
							bind:value={item.supplierId}
							required
							placeholder="Search supplier"
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
					<div class="sm:col-span-1">
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

	<div class="border-theme space-y-4 border-t pt-6">
		<div class="grid gap-4 sm:grid-cols-3">
			<Input
				label="Tax"
				type="text"
				bind:value={tax}
				onblur={() => (tax = formatNumber(parseIdNumber(tax)))}
				error={errors.tax}
			/>
			<Input
				label="Shipping"
				type="text"
				bind:value={shipping}
				onblur={() => (shipping = formatNumber(parseIdNumber(shipping)))}
				error={errors.shipping}
			/>
			<Input
				label="Other fees"
				type="text"
				bind:value={otherFees}
				onblur={() => (otherFees = formatNumber(parseIdNumber(otherFees)))}
				error={errors.otherFees}
			/>
		</div>
		<div class="flex items-center justify-between">
			<div>
				<p class="text-muted text-sm">Line total {formatCurrency(lineTotal)}</p>
				<p class="text-muted text-sm">Grand total</p>
				<p class="text-2xl font-bold text-primary-600">{formatCurrency(grandTotal)}</p>
			</div>
			<div class="flex gap-3">
				<Button variant="secondary" href="/purchasing">Cancel</Button>
				<Button type="submit" variant="primary" {loading}>{submitLabel}</Button>
			</div>
		</div>
	</div>
</form>
