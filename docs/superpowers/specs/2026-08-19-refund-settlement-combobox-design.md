# Searchable selects, PR supplier settlement, refund requests, kas kecil source of fund

Date: 2026-08-19  
App: Casan ERP 0.7.0

## Goal

Staff can find products and suppliers by typing. After goods are bought, Admin records actual spend **per supplier** (goods + tax + delivery + other). Unused PR money becomes a **refund request**; Finance or Admin approve it into kas kecil or mark it returned to the office bank account. Kas kecil top-ups have a source-of-fund dropdown and a clearer ledger.

## Locked decisions

- Approach **1**: one refund queue at `/petty-cash/refunds`; settlement on the existing PR detail / goods-receipt page.
- Leftover needs approval (**B**). Overspend still receives; extras are recorded; no extra approval (**A**).
- Admin submits **one settlement per supplier** on that PR (**A**). Leftover uses **full PR line totals** for that supplier (qty × price), not only qty already received.
- Header **default supplier** is removed. Every new PR line has a required searchable supplier.
- Petty-cash buy requires a supplier. Product block shows code, name, current stock, unit, catalog unit price.
- Catalog-variance rows (shop cheaper than catalog on a cash buy) stay automatic and read-only. They are not approve/reject.

## Out of scope

- Real bank transfer API or a chart of accounts
- Editing spends or catalog-variance rows
- Petty cash attached to PR receive qty
- Non-stock cash-out
- Creating a product or supplier inline from the combobox
- Multi petty-cash boxes

---

## 1. Data

### 1.1 `RefundRequest`

PR leftover only. Catalog-variance stays existing `REFUND` ledger rows (no second table, no approve/reject).

| Field | Notes |
|---|---|
| `id` | uuid |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `destination` | `KAS_KECIL` \| `BANK` |
| `amount` | leftover, integer IDR |
| `purchaseId` | required |
| `supplierId` | nullable = “No supplier” card for old PRs |
| `pettyCashTransactionId` | TOP_UP or TRANSFER created on approve |
| `prTotal` / `actualGoods` / `tax` / `delivery` / `other` / `bill` | snapshot at submit |
| `rejectReason` | required on reject, min 3 chars |
| `createdBy` / `decidedBy` / `createdAt` / `decidedAt` | audit |

Unique while `status` is `PENDING` or `APPROVED`: `(purchaseId, supplierId)`. Treat null `supplierId` as a real key (one “No supplier” request per PR). After `REJECTED`, Admin may submit again.

### 1.2 Petty cash ledger

New optional `sourceOfFund` on `PettyCashTransaction`:

`CASH` | `BANK_TRANSFER` | `DIRECTOR` | `REVENUE` | `OTHER` | `PR_LEFTOVER`

Required on new `TOP_UP`. Existing rows with null display as “—”. Edit top-up may set source.

New type `TRANSFER`: amount stored, **balance does not change** (`balanceAfter` = balance before). Used when a PR leftover is approved to rekening kantor so the desk ledger still shows the return.

Types and balance:

| Type | Balance | Who writes it |
|---|---|---|
| `TOP_UP` | +amount | Manual top-up, or approve leftover → kas kecil |
| `SPEND` | −amount paid | Petty-cash buy |
| `REFUND` | unchanged | Auto catalog variance |
| `TRANSFER` | unchanged | Approve leftover → bank |

Edit remains **top-up only**: amount, note, source of fund. Replay in `createdAt` order. Reject save if a later spend would go below zero.

### 1.3 Supplier settlement storage

Store the latest settlement numbers on a `PurchaseSupplierSettlement` row (`purchaseId` + `supplierId` unique, null supplier allowed). Saving the card upserts this even when leftover is 0 (overspend or exact). Refund request copies the snapshot; later edits to the card do not change a pending/approved request (must reject first to resubmit).

### 1.4 PR lines

`supplierId` required on create/update of a PR. Old PRs with empty line suppliers still load; the settlement card label is **No supplier**.

---

## 2. Screens

### 2.1 Combobox

One `Combobox` UI control (label, required, error). Filters options by substring on `label` (product: `CODE — name`; supplier: name). Keyboard: type, arrow, enter, escape. Value is the id; empty is invalid when required. Used on:

- Stock movement: product
- PR lines: product and supplier
- Petty-cash buy: product and supplier

Not used for small closed lists (department, purpose, type filters, source of fund).

### 2.2 PR create/edit

Remove header default supplier and the “use default supplier” line option. Add-item starts with empty supplier. Save fails if any line lacks `productId`, qty, price, or `supplierId`.

### 2.3 Buy with petty cash

Required searchable supplier. Product detail under the product field: current stock, unit, catalog unit price. Amount paid still follows catalog total until the user types a different paid amount.

### 2.4 PR detail — receive + settlement

Keep per-line receive (qty this delivery, remaining cap).

**One card per distinct supplier** on the PR (plus No supplier if needed):

- PR total = sum of line qty × price for that supplier
- Actual goods total (one number, not per line)
- Tax, delivery, other (optional, default 0)
- Bill = actual goods + extras
- If bill < PR total: leftover, destination Kas kecil / Rekening kantor, **Submit refund request**
- If bill ≥ PR total: save extras only; no request (“overspend, no refund”)

Admin with `purchasing:receive` only. Submit blocked if leftover ≤ 0 or a pending/approved request already exists for that PR + supplier.

Settlement may be saved without a receive on that click (partial deliveries already in).

### 2.5 Refund list `/petty-cash/refunds`

Tabs: **Pending** | **Posted**.

- Pending: leftover requests with `PENDING`. Actions: Approve, Reject (reason).
- Posted: approved/rejected leftovers **and** petty-cash `REFUND` (catalog variance) rows.

Filters (shared with CSV): From/To (Asia/Jakarta inclusive days), kind (`PR leftover` / `Catalog variance`), destination (leftover only). Export filename `petty-cash-refunds.csv`, UTF-8 BOM.

Approve Kas kecil: `TOP_UP` for `amount`, `sourceOfFund = PR_LEFTOVER`, note includes PR number + supplier name; request status `APPROVED`.  
Approve bank: `TRANSFER` for `amount`, note same; box balance unchanged; status `APPROVED`.  
Reject: status `REJECTED`, reason stored; settlement numbers remain.

Who: `pettyCash:view` to list/export; `pettyCash:write` to approve/reject (Admin and Finance).

### 2.6 Kas kecil `/petty-cash`

Balance card unchanged. Top-up: amount, **source of fund** (required Select), note. Ledger columns: Date, Type, Source, In, Out, Balance after, Product/supplier, Note, Edit. In = top-up (and not spend). Out = spend. Transfer and catalog refund: amount in a Type badge, In/Out blank or em dash, balance after unchanged.

Filters: From, To, Type (All / Top up / Spend / Refund / Transfer), Source of fund. CSV `petty-cash-ledger.csv` includes the new columns.

---

## 3. Errors

- Duplicate pending/approved PR leftover for same purchase + supplier → 409, UI shows existing request.
- Combobox submit without a matching id → field error.
- Top-up missing source → field error.
- Reject without reason → field error.
- Approve invalid amount → 400.
- Top-up edit replay would bankrupt a later spend → 400, same copy as today.

---

## 4. Tests

- Leftover = PR supplier total − actual goods − tax − delivery − other; overspend creates no request.
- Unique pending/approved per purchase + supplier; resubmit after reject.
- Approve kas kecil increases balance; approve transfer does not; both appear on ledger.
- Catalog variance still creates `REFUND` + posted list row, no pending.
- PR create without line supplier fails; with suppliers succeeds; header supplier field absent.
- Combobox filter matches code or name (unit).
- Petty-cash buy requires supplier.
- Ledger CSV includes `sourceOfFund`; top-up edit still blocks negative replay.

---

## 5. Permissions (unchanged roles)

| Action | Permission |
|---|---|
| Combobox / PR create | existing `purchasing:write` |
| Receive + settlement + submit request | `purchasing:receive` |
| View refund list + ledger | `pettyCash:view` |
| Top-up, edit top-up, approve/reject request | `pettyCash:write` |
| Buy with petty cash | `stock:write` + `pettyCash:write` |
