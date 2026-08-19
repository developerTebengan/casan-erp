<script lang="ts">
	import { Card, Button, Input, Select } from '$lib/components/ui';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import {
		leftover,
		prTotalForSupplier,
		settlementBill,
		supplierKey,
		supplierKeysFromItems,
		canSubmitRefundRequest
	} from '$lib/purchasing/settlement';
	import type { Purchase } from '$lib/types';

	interface SettlementRow {
		supplierId: string | null;
		supplierKey: string;
		actualGoods: number;
		tax: number;
		delivery: number;
		other: number;
	}

	interface RequestRow {
		id: string;
		status: string;
		destination: string;
		amount: number;
		supplierKey?: string;
		supplierId: string | null;
	}

	interface Props {
		purchase: Purchase;
		settlements: SettlementRow[];
		requests: RequestRow[];
		canReceive: boolean;
	}

	let { purchase, settlements, requests, canReceive }: Props = $props();

	const destOptions = [
		{ value: 'KAS_KECIL', label: 'Kas kecil' },
		{ value: 'BANK', label: 'Rekening kantor' }
	];

	const cards = $derived(
		supplierKeysFromItems(purchase.items ?? []).map((key) => {
			const item = (purchase.items ?? []).find((i) => supplierKey(i.supplierId) === key);
			const saved = settlements.find((s) => s.supplierKey === key);
			const name =
				item?.supplier?.name ?? (key === 'none' ? 'No supplier' : 'Supplier');
			return {
				key,
				supplierId: key === 'none' ? null : key,
				name,
				prTotal: prTotalForSupplier(
					(purchase.items ?? []).map((i) => ({
						supplierId: i.supplierId,
						qty: i.qty,
						price: Number(i.price)
					})),
					key
				),
				actualGoods: String(saved?.actualGoods ?? ''),
				tax: String(saved?.tax ?? '0'),
				delivery: String(saved?.delivery ?? '0'),
				other: String(saved?.other ?? '0'),
				destination: 'KAS_KECIL',
				active: requests.find(
					(r) =>
						supplierKey(r.supplierId) === key &&
						(r.status === 'PENDING' || r.status === 'APPROVED')
				)
			};
		})
	);

	let drafts = $state<
		Record<string, { actualGoods: string; tax: string; delivery: string; other: string; destination: string }>
	>({});
	let loadingKey = $state('');

	function draft(key: string) {
		const card = cards.find((c) => c.key === key);
		return (
			drafts[key] ?? {
				actualGoods: card?.actualGoods ?? '',
				tax: card?.tax ?? '0',
				delivery: card?.delivery ?? '0',
				other: card?.other ?? '0',
				destination: 'KAS_KECIL'
			}
		);
	}

	function setDraft(key: string, patch: Partial<ReturnType<typeof draft>>) {
		drafts = { ...drafts, [key]: { ...draft(key), ...patch } };
	}

	async function save(key: string, submitRequest: boolean) {
		const card = cards.find((c) => c.key === key);
		if (!card) return;
		const d = draft(key);
		loadingKey = key + (submitRequest ? '-req' : '-save');
		try {
			const res = await fetch(`/api/purchases/${purchase.id}/settlement`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					supplierId: card.supplierId,
					actualGoods: Number(d.actualGoods) || 0,
					tax: Number(d.tax) || 0,
					delivery: Number(d.delivery) || 0,
					other: Number(d.other) || 0,
					destination: d.destination,
					submitRequest
				})
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toastStore.error(body.errors?.form?.[0] || body.message || 'Failed to save');
				return;
			}
			toastStore.success(submitRequest ? 'Refund request submitted' : 'Settlement saved');
			location.reload();
		} finally {
			loadingKey = '';
		}
	}
</script>

{#if purchase.approvalStatus === 'APPROVED' && (purchase.items?.length ?? 0) > 0}
	<div class="space-y-4">
		<h3 class="text-main text-lg font-semibold">Supplier settlement</h3>
		<p class="text-muted text-sm">
			Actual goods + tax, delivery, other — per supplier. Leftover becomes a refund request.
		</p>
		{#each cards as card}
			{@const d = draft(card.key)}
			{@const bill = settlementBill(
				Number(d.actualGoods) || 0,
				Number(d.tax) || 0,
				Number(d.delivery) || 0,
				Number(d.other) || 0
			)}
			{@const left = leftover(card.prTotal, bill)}
			<Card padding="lg">
				<div class="mb-4">
					<p class="text-main font-semibold">{card.name}</p>
					<p class="text-muted text-sm">PR total {formatCurrency(card.prTotal)}</p>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Input
						label="Actual goods total"
						type="number"
						min="0"
						value={d.actualGoods}
						oninput={(e) =>
							setDraft(card.key, { actualGoods: (e.target as HTMLInputElement).value })}
						disabled={!canReceive}
					/>
					<Input
						label="Tax"
						type="number"
						min="0"
						value={d.tax}
						oninput={(e) => setDraft(card.key, { tax: (e.target as HTMLInputElement).value })}
						disabled={!canReceive}
					/>
					<Input
						label="Delivery"
						type="number"
						min="0"
						value={d.delivery}
						oninput={(e) =>
							setDraft(card.key, { delivery: (e.target as HTMLInputElement).value })}
						disabled={!canReceive}
					/>
					<Input
						label="Other"
						type="number"
						min="0"
						value={d.other}
						oninput={(e) => setDraft(card.key, { other: (e.target as HTMLInputElement).value })}
						disabled={!canReceive}
					/>
				</div>
				<div class="mt-4 space-y-2 text-sm">
					<p>Bill {formatCurrency(bill)}</p>
					{#if left > 0}
						<p class="text-success-700 dark:text-success-500">Leftover {formatCurrency(left)}</p>
					{:else}
						<p class="text-muted">Overspend or exact — no refund.</p>
					{/if}
					{#if card.active}
						<p>
							Request {card.active.status.toLowerCase()}
							({card.active.destination === 'KAS_KECIL' ? 'Kas kecil' : 'Bank'},
							{formatCurrency(card.active.amount)})
						</p>
					{/if}
				</div>
				{#if canReceive}
					<div class="mt-4 flex flex-wrap items-end gap-3">
						{#if canSubmitRefundRequest(left) && !card.active}
							<Select
								label="Return leftover to"
								options={destOptions}
								value={d.destination}
								onchange={(e) =>
									setDraft(card.key, {
										destination: (e.target as HTMLSelectElement).value
									})}
							/>
						{/if}
						<Button
							variant="secondary"
							loading={loadingKey === card.key + '-save'}
							onclick={() => save(card.key, false)}
						>
							Save settlement
						</Button>
						{#if canSubmitRefundRequest(left) && !card.active}
							<Button
								variant="primary"
								loading={loadingKey === card.key + '-req'}
								onclick={() => save(card.key, true)}
							>
								Submit refund request
							</Button>
						{/if}
					</div>
				{/if}
			</Card>
		{/each}
	</div>
{/if}
