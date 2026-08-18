# Petty cash, price variance refunds, and Excel export

Date: 2026-08-18  
App: Casan ERP 0.6.0

## Goal

Let Admin buy stock with petty cash (qty + amount paid). If paid is less than catalog total, the unused amount is a refund row. Extra spend (paid more than catalog) comes from petty cash. Admin and Finance can top up the box. Export stock movement and the refund list for Excel.

## Out of scope

- Petty cash on PR goods receipt
- Approvals on spends or top-ups
- Full accounting / GL
- Opening-balance wizard (first top-up is the opening)

## Petty cash box

One account (`id: default`) with a running `balance`.

Ledger types:

| Type | Balance | Who |
| --- | --- | --- |
| `TOP_UP` | increases | Admin, Finance |
| `SPEND` | decreases by **amount paid** | Admin (via stock buy) |
| `REFUND` | **does not change balance** | Auto when paid < catalog total |

Refunds are variance vs catalog: money was never spent, so it is already in the box. The refund list is the audit of unused catalog budget.

Example: balance 1,000,000. Catalog 100,000, paid 80,000 → spend 80,000, balance 920,000, refund list 20,000. Catalog 100,000, paid 120,000 → spend 120,000, balance 880,000, no refund.

## Buy stock with petty cash (Admin)

New page `/stock/petty-cash`:

- Product, qty, **amount paid** (required)
- Optional **actual unit price** (admin price adjust)
- Optional **update catalog unit price** to that actual
- Note

Creates:

1. Stock `IN`, source `PETTY_CASH`
2. `SPEND` of amount paid (fail if balance too low)
3. `REFUND` if catalog unit price × qty > paid

Catalog total uses the product price **before** any catalog update.

## Screens

- `/petty-cash` — balance, top-up form (Admin/Finance), recent ledger
- `/petty-cash/refunds` — refund list, date filter, Excel export
- `/stock` — Excel export of current filters; button **Buy with petty cash** (Admin)

Exports are UTF-8 CSV with BOM so Excel opens them.

## Permissions

- `pettyCash:view` / `pettyCash:write`: Admin and Finance
- Stock buy with petty cash still needs `stock:write` (Admin)

## Data

`petty_cash_accounts(id, balance, updatedAt)`  
`petty_cash_transactions(type, amount, balanceAfter, expectedAmount, paidAmount, catalogUnitPrice, actualUnitPrice, qty, productId, stockTransactionId, note, createdBy, createdAt)`
