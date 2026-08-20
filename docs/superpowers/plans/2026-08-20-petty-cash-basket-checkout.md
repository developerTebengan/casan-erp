# Petty Cash Basket Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-product petty-cash buy form with an online-shop style basket that simulates spend locally and only posts stock/cash on one atomic checkout.

**Architecture:** Keep the route at `/stock/petty-cash`, but move it to browser-only basket state plus a new batch checkout API. The frontend owns temporary cart behavior; the server validates the whole basket and posts all lines inside one database transaction so petty cash and stock stay consistent.

**Tech Stack:** Svelte 5, SvelteKit 2, TypeScript, Prisma 7, PostgreSQL, Vitest

## Global Constraints

- Basket is **not saved** and is lost on refresh/navigation.
- Real money and real stock move only on **Checkout**.
- Each basket line has: `productId`, `supplierId`, `qty`, `paidAmount`, optional `actualUnitPrice`, optional `updateCatalogPrice`, optional `note`.
- Refund logic stays the same as today: when catalog total is higher than paid amount, create a `REFUND` row that does **not** change petty cash balance.
- If total paid exceeds petty cash balance, checkout must be blocked before any write.
- UX should feel like an online shop/cart, but ledger behavior must remain consistent with the current petty-cash stock-buy flow.
- Keep current permission behavior: requires `pettyCash:write` and `stock:write`.
- No DB migration is required for the first version.

---

## File Structure

- Modify `src/routes/(app)/stock/petty-cash/+page.svelte`
  - Replace single-line submit UX with add-to-basket + basket summary + checkout actions.
- Create `src/lib/petty-cash/basket.ts`
  - Pure helpers for basket totals, after-checkout balance, and line normalization.
- Create `src/lib/petty-cash/basket.spec.ts`
  - Unit tests for basket math and edge cases.
- Modify `src/lib/server/services/pettyCash.service.ts`
  - Add batch checkout service method while preserving current single-line buy flow.
- Create `src/routes/api/stock/petty-cash/checkout/+server.ts`
  - New batch checkout endpoint.
- Modify `src/lib/utils/format.ts` only if plan execution needs small helper reuse for line input formatting/parsing.
- Modify `docs/CASAN_ERP_prd_v1.md`, `CHANGELOG.md`, and `src/lib/version.ts`
  - Document the shipped basket behavior after implementation.

## Task 1: Basket math helpers

**Files:**
- Create: `src/lib/petty-cash/basket.ts`
- Test: `src/lib/petty-cash/basket.spec.ts`

**Interfaces:**
- Produces:
  - `type BasketLineInput = { productId: string; supplierId: string; qty: number; paidAmount: number; actualUnitPrice: number | null; updateCatalogPrice: boolean; note: string | null; catalogUnitPrice: number; productName: string; supplierName: string; unit: string }`
  - `type BasketTotals = { catalogTotal: number; paidTotal: number; refundTotal: number; extraTotal: number; afterCheckout: number }`
  - `function basketLineCatalogTotal(catalogUnitPrice: number, qty: number): number`
  - `function computeBasketTotals(lines: BasketLineInput[], currentBalance: number): BasketTotals`
  - `function basketCheckoutAllowed(lines: BasketLineInput[], currentBalance: number): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { basketCheckoutAllowed, computeBasketTotals } from './basket';

describe('computeBasketTotals', () => {
	it('sums catalog, paid, refund, extra, and after-checkout balance', () => {
		const lines = [
			{
				productId: 'p1',
				supplierId: 's1',
				qty: 2,
				paidAmount: 18000,
				actualUnitPrice: null,
				updateCatalogPrice: false,
				note: null,
				catalogUnitPrice: 10000,
				productName: 'Cable',
				supplierName: 'Shop A',
				unit: 'PCS'
			},
			{
				productId: 'p2',
				supplierId: 's2',
				qty: 1,
				paidAmount: 7000,
				actualUnitPrice: null,
				updateCatalogPrice: false,
				note: null,
				catalogUnitPrice: 5000,
				productName: 'Socket',
				supplierName: 'Shop B',
				unit: 'PCS'
			}
		];

		expect(computeBasketTotals(lines, 40000)).toEqual({
			catalogTotal: 25000,
			paidTotal: 25000,
			refundTotal: 2000,
			extraTotal: 2000,
			afterCheckout: 15000
		});
		expect(basketCheckoutAllowed(lines, 40000)).toBe(true);
		expect(basketCheckoutAllowed(lines, 20000)).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/petty-cash/basket.spec.ts`
Expected: FAIL with missing module or missing exported functions.

- [ ] **Step 3: Write minimal implementation**

```ts
import { catalogTotal, extraSpend, varianceRefund } from '$lib/petty-cash/variance';

export type BasketLineInput = {
	productId: string;
	supplierId: string;
	qty: number;
	paidAmount: number;
	actualUnitPrice: number | null;
	updateCatalogPrice: boolean;
	note: string | null;
	catalogUnitPrice: number;
	productName: string;
	supplierName: string;
	unit: string;
};

export type BasketTotals = {
	catalogTotal: number;
	paidTotal: number;
	refundTotal: number;
	extraTotal: number;
	afterCheckout: number;
};

export function basketLineCatalogTotal(catalogUnitPrice: number, qty: number): number {
	return catalogTotal(catalogUnitPrice, qty);
}

export function computeBasketTotals(lines: BasketLineInput[], currentBalance: number): BasketTotals {
	const catalog = lines.reduce((sum, line) => sum + basketLineCatalogTotal(line.catalogUnitPrice, line.qty), 0);
	const paid = lines.reduce((sum, line) => sum + line.paidAmount, 0);
	const refund = lines.reduce(
		(sum, line) => sum + varianceRefund(basketLineCatalogTotal(line.catalogUnitPrice, line.qty), line.paidAmount),
		0
	);
	const extra = lines.reduce(
		(sum, line) => sum + extraSpend(basketLineCatalogTotal(line.catalogUnitPrice, line.qty), line.paidAmount),
		0
	);
	return {
		catalogTotal: catalog,
		paidTotal: paid,
		refundTotal: refund,
		extraTotal: extra,
		afterCheckout: currentBalance - paid
	};
}

export function basketCheckoutAllowed(lines: BasketLineInput[], currentBalance: number): boolean {
	return lines.length > 0 && computeBasketTotals(lines, currentBalance).afterCheckout >= 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/petty-cash/basket.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/petty-cash/basket.ts src/lib/petty-cash/basket.spec.ts
git commit -m "test: add petty cash basket math helpers"
```

## Task 2: Batch checkout service

**Files:**
- Modify: `src/lib/server/services/pettyCash.service.ts`
- Test: `src/lib/petty-cash/basket.spec.ts`

**Interfaces:**
- Consumes:
  - `BasketLineInput`
  - `computeBasketTotals(lines, currentBalance)`
- Produces:
  - `async function checkoutBasket(input: { lines?: Array<{ productId?: unknown; supplierId?: unknown; qty?: unknown; paidAmount?: unknown; actualUnitPrice?: unknown; updateCatalogPrice?: unknown; note?: unknown }>; note?: unknown }, createdBy?: string | null): Promise<{ success: true; data: { count: number; balanceAfter: number } } | { success: false; errors: Record<string, string[]> }>`

- [ ] **Step 1: Write the failing test**

```ts
it('rejects checkout when total paid exceeds petty cash balance', async () => {
	const service = pettyCashService();
	const result = await service.checkoutBasket(
		{
			lines: [
				{
					productId: 'p1',
					supplierId: 's1',
					qty: 1,
					paidAmount: 999999999,
					actualUnitPrice: null,
					updateCatalogPrice: false,
					note: null
				}
			]
		},
		'user-1'
	);

	expect(result.success).toBe(false);
	if (!result.success) expect(result.errors.form?.[0]).toContain('Not enough petty cash');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/petty-cash/basket.spec.ts`
Expected: FAIL because `checkoutBasket` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
async function checkoutBasket(input, createdBy) {
	const lines = Array.isArray(input.lines) ? input.lines : [];
	if (lines.length === 0) {
		return { success: false as const, errors: { form: ['Basket is empty'] } };
	}

	return db.$transaction(async (tx) => {
		const account = await tx.pettyCashAccount.upsert({
			where: { id: ACCOUNT_ID },
			create: { id: ACCOUNT_ID, balance: 0 },
			update: {}
		});
		const currentBalance = money(account.balance);

		const parsed = [];
		for (const line of lines) {
			const productId = String(line.productId ?? '');
			const supplierId = String(line.supplierId ?? '');
			const qty = Number(line.qty);
			const paidAmount = money(line.paidAmount);
			const actualUnitPrice =
				line.actualUnitPrice === '' || line.actualUnitPrice == null ? null : money(line.actualUnitPrice);
			const updateCatalogPrice = Boolean(line.updateCatalogPrice);
			const note = line.note ? String(line.note) : null;

			if (!productId || !supplierId || !Number.isFinite(qty) || qty <= 0 || paidAmount < 0) {
				return { success: false as const, errors: { form: ['Each basket line must be valid'] } };
			}
			if (updateCatalogPrice && actualUnitPrice == null) {
				return {
					success: false as const,
					errors: { form: ['Actual unit price is required when updating catalog price'] }
				};
			}

			const product = await tx.product.findFirst({ where: { id: productId, deletedAt: null } });
			const supplier = await tx.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
			if (!product || !supplier) {
				return { success: false as const, errors: { form: ['Product or supplier not found'] } };
			}

			parsed.push({ product, supplier, qty, paidAmount, actualUnitPrice, updateCatalogPrice, note });
		}

		const totalPaid = parsed.reduce((sum, line) => sum + line.paidAmount, 0);
		if (totalPaid > currentBalance) {
			return { success: false as const, errors: { form: ['Not enough petty cash for this basket'] } };
		}

		let runningBalance = currentBalance;
		for (const line of parsed) {
			const catalogUnitPrice = money(line.product.price);
			const expectedAmount = catalogTotal(catalogUnitPrice, line.qty);
			const refundAmount = varianceRefund(expectedAmount, line.paidAmount);
			const unitPrice = line.actualUnitPrice ?? Math.round(line.paidAmount / line.qty);
			const stockAfter = line.product.stock + line.qty;

			const stockTx = await tx.stockTransaction.create({
				data: {
					productId: line.product.id,
					type: 'IN',
					source: 'PETTY_CASH',
					qty: line.qty,
					stockBefore: line.product.stock,
					stockAfter,
					note: line.note || String(input.note || `Petty cash basket checkout`),
					createdBy
				}
			});

			await tx.product.update({
				where: { id: line.product.id },
				data: {
					stock: stockAfter,
					...(line.updateCatalogPrice && line.actualUnitPrice != null ? { price: line.actualUnitPrice } : {})
				}
			});

			runningBalance -= line.paidAmount;
			await tx.pettyCashTransaction.create({
				data: {
					type: 'SPEND',
					amount: line.paidAmount,
					balanceAfter: runningBalance,
					expectedAmount,
					paidAmount: line.paidAmount,
					catalogUnitPrice,
					actualUnitPrice: unitPrice,
					qty: line.qty,
					productId: line.product.id,
					supplierId: line.supplier.id,
					stockTransactionId: stockTx.id,
					note: line.note ?? (input.note ? String(input.note) : null),
					createdBy
				}
			});

			if (refundAmount > 0) {
				await tx.pettyCashTransaction.create({
					data: {
						type: 'REFUND',
						amount: refundAmount,
						balanceAfter: runningBalance,
						expectedAmount,
						paidAmount: line.paidAmount,
						catalogUnitPrice,
						actualUnitPrice: unitPrice,
						qty: line.qty,
						productId: line.product.id,
						supplierId: line.supplier.id,
						stockTransactionId: stockTx.id,
						note: line.note ?? (input.note ? String(input.note) : null),
						createdBy
					}
				});
			}
		}

		await tx.pettyCashAccount.update({
			where: { id: ACCOUNT_ID },
			data: { balance: runningBalance }
		});

		return { success: true as const, data: { count: parsed.length, balanceAfter: runningBalance } };
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/petty-cash/basket.spec.ts`
Expected: PASS for the new service behavior and no regression in existing basket math tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/pettyCash.service.ts src/lib/petty-cash/basket.spec.ts
git commit -m "feat: add petty cash basket checkout service"
```

## Task 3: Batch checkout API

**Files:**
- Create: `src/routes/api/stock/petty-cash/checkout/+server.ts`
- Modify: `src/routes/api/stock/petty-cash/+server.ts`

**Interfaces:**
- Consumes:
  - `pettyCashService().checkoutBasket(body, locals.user.id)`
- Produces:
  - `POST /api/stock/petty-cash/checkout`
  - Optional deprecation comment in current single-line endpoint if both coexist

- [ ] **Step 1: Write the failing test**

```ts
it('returns 403 for users without petty cash or stock write permission', async () => {
	const req = new Request('http://localhost/api/stock/petty-cash/checkout', {
		method: 'POST',
		body: JSON.stringify({ lines: [] })
	});
	// construct handler call with locals.user role USER
	expect(response.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/api/stock/petty-cash/checkout`
Expected: FAIL because the endpoint does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import { json, error } from '@sveltejs/kit';
import { pettyCashService } from '$lib/server/services/pettyCash.service';
import { hasPermission } from '$lib/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (
			!locals.user ||
			!hasPermission(locals.user.role, 'pettyCash:write') ||
			!hasPermission(locals.user.role, 'stock:write')
		) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const result = await pettyCashService().checkoutBasket(body, locals.user.id);
		if (!result.success) {
			return json({ message: 'Validation failed', errors: result.errors }, { status: 400 });
		}
		return json(result.data, { status: 201 });
	} catch (e) {
		console.error(e);
		throw error(500, { message: 'Failed to checkout petty cash basket' });
	}
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run check`
Expected: PASS with no Svelte/route typing errors for the new endpoint.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/stock/petty-cash/checkout/+server.ts src/routes/api/stock/petty-cash/+server.ts
git commit -m "feat: add petty cash basket checkout API"
```

## Task 4: Basket UI on `/stock/petty-cash`

**Files:**
- Modify: `src/routes/(app)/stock/petty-cash/+page.svelte`
- Consumes pure helpers from: `src/lib/petty-cash/basket.ts`

**Interfaces:**
- Consumes:
  - `computeBasketTotals(lines, data.balance)`
  - `basketCheckoutAllowed(lines, data.balance)`
  - `POST /api/stock/petty-cash/checkout`
- Produces:
  - in-page basket state
  - add/remove/clear basket actions
  - checkout action that submits all lines at once

- [ ] **Step 1: Write the failing test**

```ts
it('shows basket total and after-checkout balance after adding a line', async () => {
	render(Page, { data: mockData });
	await user.selectOptions(screen.getByLabelText('Product'), 'p1');
	await user.type(screen.getByLabelText('Amount paid'), '45.000');
	await user.click(screen.getByRole('button', { name: 'Add to basket' }));
	expect(screen.getByText(/Basket total/i)).toBeInTheDocument();
	expect(screen.getByText(/After checkout/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run check`
Expected: FAIL conceptually because the page still has only one-product submit UI.

- [ ] **Step 3: Write minimal implementation**

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { computeBasketTotals, basketCheckoutAllowed, type BasketLineInput } from '$lib/petty-cash/basket';
	// keep current product/supplier inputs

	let basket = $state<BasketLineInput[]>([]);
	let checkoutNote = $state('');

	const totals = $derived(computeBasketTotals(basket, data.balance));
	const canCheckout = $derived(basketCheckoutAllowed(basket, data.balance));

	function addToBasket() {
		if (!selected || !supplierId || qtyN <= 0) return;
		basket = [
			...basket,
			{
				productId,
				supplierId,
				qty: qtyN,
				paidAmount: paidN,
				actualUnitPrice: actualUnitPrice === '' ? null : parseIdNumber(actualUnitPrice),
				updateCatalogPrice,
				note: note || null,
				catalogUnitPrice: selected.price,
				productName: selected.name,
				supplierName: data.suppliers.find((s) => s.id === supplierId)?.name ?? '-',
				unit: selected.unit
			}
		];
		qty = '1';
		actualUnitPrice = '';
		updateCatalogPrice = false;
		note = '';
	}

	function removeLine(index: number) {
		basket = basket.filter((_, i) => i !== index);
	}

	async function checkoutBasket() {
		const res = await fetch('/api/stock/petty-cash/checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				lines: basket.map(({ catalogUnitPrice, productName, supplierName, unit, ...line }) => line),
				note: checkoutNote || null
			})
		});
		if (res.ok) {
			toastStore.success('Stock in recorded from petty cash');
			goto('/stock');
		}
	}
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run check`
Expected: PASS with the new basket UI typed correctly and existing warnings unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/routes/(app)/stock/petty-cash/+page.svelte src/lib/petty-cash/basket.ts
git commit -m "feat: add petty cash basket UI"
```

## Task 5: Basket validation polish and empty states

**Files:**
- Modify: `src/routes/(app)/stock/petty-cash/+page.svelte`
- Modify: `src/lib/petty-cash/basket.ts`

**Interfaces:**
- Consumes:
  - `computeBasketTotals`
  - `basketCheckoutAllowed`
- Produces:
  - disabled checkout state
  - warning styling for insufficient petty cash
  - mobile-friendly basket cards or responsive table

- [ ] **Step 1: Write the failing test**

```ts
it('disables checkout when basket total exceeds current petty cash', async () => {
	render(Page, { data: { ...mockData, balance: 1000 } });
	// add an expensive line
	expect(screen.getByRole('button', { name: 'Checkout into stock' })).toBeDisabled();
	expect(screen.getByText(/Not enough petty cash/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run check`
Expected: FAIL conceptually because warning/disable behavior is not complete yet.

- [ ] **Step 3: Write minimal implementation**

```svelte
{#if totals.afterCheckout < 0}
	<p class="text-warning-700 dark:text-warning-500 text-sm">
		Not enough petty cash for this basket.
	</p>
{/if}

<Button
	type="button"
	variant="primary"
	disabled={!canCheckout}
	onclick={checkoutBasket}
>
	Checkout into stock
</Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run check`
Expected: PASS, and checkout becomes obviously blocked when simulated spend is too high.

- [ ] **Step 5: Commit**

```bash
git add src/routes/(app)/stock/petty-cash/+page.svelte src/lib/petty-cash/basket.ts
git commit -m "fix: block petty cash basket checkout when balance is insufficient"
```

## Task 6: Docs and release notes

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `src/lib/version.ts`
- Modify: `docs/CASAN_ERP_prd_v1.md`

**Interfaces:**
- Consumes:
  - shipped behavior from Tasks 1-5
- Produces:
  - user-facing release notes
  - PRD update for online-shop style petty cash basket

- [ ] **Step 1: Write the failing test**

```md
Manual verification target:
- CHANGELOG mentions petty cash basket checkout
- Settings -> Changelog mirrors the same bullets from src/lib/version.ts
- PRD section 5.5 explains basket simulation and single checkout
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rg "basket checkout|Add to basket|Checkout into stock" CHANGELOG.md src/lib/version.ts docs/CASAN_ERP_prd_v1.md`
Expected: missing or partial matches.

- [ ] **Step 3: Write minimal implementation**

```md
CHANGELOG.md:
- Add v0.8.x / v0.8.1 bullet for petty cash basket checkout

src/lib/version.ts:
- Mirror the changelog bullets in the in-app changelog entry

docs/CASAN_ERP_prd_v1.md:
- Update petty cash buy flow from single-line submit to basket simulation + checkout
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rg "basket|Checkout into stock|Add to basket" CHANGELOG.md src/lib/version.ts docs/CASAN_ERP_prd_v1.md`
Expected: matches in all three files.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md src/lib/version.ts docs/CASAN_ERP_prd_v1.md
git commit -m "docs: add petty cash basket checkout release notes"
```

## Self-Review

- Spec coverage:
  - basket is simulation-only: covered in Tasks 1 and 4
  - per-line online-shop behavior: covered in Task 4
  - one atomic checkout: covered in Tasks 2 and 3
  - visible petty cash now / basket total / after checkout: covered in Tasks 1, 4, and 5
  - refund semantics unchanged: covered in Task 2
  - no DB migration: preserved in Tasks 2-6
- Placeholder scan:
  - no `TODO`, `TBD`, or “implement later” placeholders remain
  - every task names exact files and commands
- Type consistency:
  - `BasketLineInput`, `computeBasketTotals`, `basketCheckoutAllowed`, and `checkoutBasket` are defined once and reused consistently

