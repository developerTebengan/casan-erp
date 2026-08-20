# Petty cash basket checkout UX

Date: 2026-08-20  
App: Casan ERP 0.8.x

## Goal

Turn `/stock/petty-cash` from a one-product form into an online-shop style basket:

- show the current petty cash balance clearly
- let Admin add multiple stock lines to a temporary basket
- simulate the cash deduction before posting anything
- only move cash and stock on **Checkout**

This is still a stock-buy flow, not a general shopping cart for non-stock expenses.

## Locked

- Basket is **not saved**. It exists only in browser state and is lost on refresh/navigation.
- Real money and real stock move only on **Checkout**.
- Each basket line has its own:
  - product
  - supplier
  - qty
  - amount paid
  - optional actual unit price
  - optional update-catalog flag
- UX should feel like an online shop/cart, but accounting behavior stays consistent with the current petty-cash model.
- Refund logic stays the same as today: if paid is lower than catalog total, create a `REFUND` row that does **not** change petty cash balance.
- If total paid is higher than current petty cash balance, checkout is blocked before any write.

## Why

Admin may buy several stock items in one shop trip. The current one-product form forces repeated submit/reload cycles and hides the real "basket total vs petty cash balance" decision until each line is already posted.

The desired mental model is:

1. build a simulated basket
2. see total cash needed
3. confirm it fits inside kas kecil
4. checkout once

## Recommended approach

Use a **single-page basket + batch checkout** flow.

Why this approach:

- matches the requested online-shop metaphor
- keeps the browser interaction simple
- allows one balance check against the whole basket
- supports one atomic DB transaction so partial checkout cannot happen

Rejected alternatives:

- repeated calls to the current single-line API on checkout: risk of partial success if line 3 fails
- two-page wizard: more clicks without adding real product value

## Screen design

Route stays the same: `/stock/petty-cash`

### 1. Header summary

Replace the current inline balance sentence with a clearer summary bar at the top:

- **Petty cash now**: current account balance
- **Basket total**: sum of all line paid amounts in the simulated cart
- **After checkout**: `balance - basketTotal`

Behavior:

- updates instantly as lines are added/edited/removed
- if `afterCheckout < 0`, show warning styling

### 2. Add-to-basket form

Keep the same field family as today, but change the primary action:

- Product
- Supplier
- Qty
- Amount paid
- Actual unit price (optional)
- Update catalog unit price to actual unit price
- Line note (optional)

Primary button:

- **Add to basket**

Rules:

- Amount paid defaults to catalog unit × qty, with current id-ID formatting behavior
- User can override paid amount per line
- Form clears after add, but keeps useful defaults where appropriate:
  - qty resets to 1
  - paid amount follows the selected product/qty again
  - note clears

### 3. Basket table/card list

Show a basket below the form.

Desktop columns:

- Product
- Supplier
- Qty
- Paid
- Catalog total
- Actual unit
- Update catalog
- Remove

Mobile:

- stacked cards with the same information and actions

Per-line behavior:

- remove line
- optionally edit qty and paid inline in the basket
- catalog total and refund/extra preview re-compute immediately

### 4. Basket totals

Show a summary card under the basket:

- Catalog total: sum of catalog totals for all lines
- Basket total paid: sum of paid amounts
- Refund preview: sum of per-line refunds where catalog total > paid
- Extra spend preview: sum of per-line overspend where paid > catalog total
- After checkout petty cash: current balance minus basket total paid

### 5. Checkout actions

Bottom actions:

- **Clear basket**
- **Checkout into stock**
- shared checkout note / receipt note (optional)

Checkout button disabled when:

- basket is empty
- any line is invalid
- simulated total paid exceeds petty cash balance

## Data model and API

### Frontend state

Introduce a basket line shape in page state only:

- `productId`
- `supplierId`
- `qty`
- `paidAmount`
- `actualUnitPrice | null`
- `updateCatalogPrice`
- `note | null`

No DB persistence for drafts/carts.

### API

Add a new batch endpoint or extend the current route to support batch checkout.

Recommended shape:

- `POST /api/stock/petty-cash/checkout`

Body:

```json
{
  "lines": [
    {
      "productId": "…",
      "supplierId": "…",
      "qty": 2,
      "paidAmount": 120000,
      "actualUnitPrice": 60000,
      "updateCatalogPrice": false,
      "note": "item note"
    }
  ],
  "note": "shared receipt note"
}
```

Why a new endpoint:

- keeps the old single-item logic intact during migration
- makes validation clearer
- reduces ambiguity between line note and shared checkout note

## Service behavior

Add a batch service method in `pettyCash.service.ts`.

### Validation

Before any write:

- basket must have at least one line
- every line must have valid product, supplier, qty > 0, paidAmount >= 0
- if provided, actual unit price must be >= 0
- total paid across all lines must be <= petty cash balance

### Atomic transaction

Run the whole checkout in one DB transaction:

1. load petty cash account once
2. validate total basket paid vs current balance
3. for each line:
   - load product and supplier
   - compute expected amount from catalog price × qty
   - compute refund amount
   - create stock `IN` transaction (`PETTY_CASH`)
   - update product stock
   - optionally update catalog unit price
   - create `SPEND`
   - create `REFUND` if needed
4. update petty cash account balance after each spend or once from total spend

Preferred ledger behavior:

- one `SPEND` row per basket line, because each line still represents one product purchase
- one `REFUND` row per basket line if applicable

This keeps current reporting semantics and product-level auditability.

## Balance semantics

Simulation only:

- `basketTotal = Σ paidAmount`
- `afterCheckout = currentBalance - basketTotal`

Real posting:

- petty cash decreases only by the sum of `SPEND` rows
- `REFUND` rows still do not increase the petty cash balance

## Redirect and feedback

On success:

- toast: `Stock in recorded from petty cash`
- redirect to `/stock` or `/petty-cash`

Recommendation:

- redirect to `/stock` if the main user goal is inventory confirmation
- keep `/petty-cash` as a follow-up link in the toast or UI copy later if needed

## Permissions

Keep current permissions:

- requires `pettyCash:write`
- requires `stock:write`

This stays Admin-only in practice, consistent with the current petty-cash stock-buy flow.

## Migration strategy

Phase this in without a DB migration:

1. add basket UI on `/stock/petty-cash`
2. add batch checkout endpoint/service
3. retire or internally reuse the current single-line submit flow

No schema changes required for the first version.

## Edge cases

- user refreshes page: basket is lost
- basket total exceeds balance after editing: checkout disabled and warning shown
- qty changed to zero or invalid: line blocked until fixed or removed
- product deleted or supplier deleted between add and checkout: server rejects line and whole checkout rolls back
- actual unit price omitted: keep current fallback behavior
- update-catalog checked but actual unit price empty: reject that line with a clear validation error

## Out of scope

- saved carts
- multi-shop basket grouping
- partial checkout of only some basket lines after validation failure
- non-stock petty-cash expenses
- undo/void basket checkout

## Success criteria

- Admin can add multiple stock lines before posting anything
- Admin always sees current petty cash, basket total, and after-checkout balance
- Clicking checkout posts all lines or none
- Stock movement and petty cash ledger remain audit-safe and product-specific
- The flow feels like an online shop rather than repeated one-line form submission
