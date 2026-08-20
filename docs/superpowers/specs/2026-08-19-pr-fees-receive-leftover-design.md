# PR header fees, receive qty/price, whole-PR leftover, New refund

Date: 2026-08-19  
App: Casan ERP 0.8.0

## Goal

Approvers see tax, shipping, and other fees **on the PR**. At stock-in, Admin can change qty and unit price and type **actual** fees. Unused money vs that approved grand total is **one leftover refund per PR** (kas kecil or rekening kantor). Staff can also file that leftover from the refund list (**New refund**).

## Locked decisions

- Approach **C** then **1**: estimates on the PR header; actuals at receive; leftover is **whole PR**, not per supplier.
- Per-supplier settlement cards on the PR detail page are removed. Old per-supplier `RefundRequest` rows stay on the refund list.
- Catalog product price is not changed by receive.
- Overspend (actual ≥ approved grand) still receives; no leftover request.

## Out of scope

- Bank API / GL
- Changing catalog price from goods receipt
- Per-supplier leftover for new requests
- Non-stock cash-out
- Editing spends

---

## 1. Data

### 1.1 Purchase header fees (estimates)

On `purchases`:

| Field | Default |
|---|---|
| `tax` | 0 |
| `shipping` | 0 |
| `otherFees` | 0 |

`total` (existing) = sum of line subtotals **+ tax + shipping + otherFees**.

Editable on create/update while `approvalStatus` is not `APPROVED` and not `REJECTED`. After full **APPROVED**, header fees are locked (API 400 if changed).

### 1.2 Purchase actual extras

On `purchases` (or a 1:1 `purchase_receipts` row — same table is enough):

| Field | Default |
|---|---|
| `actualTax` | null (treat as header `tax` in the UI until saved) |
| `actualShipping` | null |
| `actualOtherFees` | null |

Admin (`purchasing:receive`) may PATCH these after approval. Saving does not require a receive on that click.

### 1.3 Actual unit price on stock-in

`stock_transactions.unitPrice` (Decimal, nullable). For `source = PURCHASE` and `type = IN`, required, default = that PR line’s price. Actual goods for a PR = sum of `qty * unitPrice` over those IN rows (`deletedAt` null).

### 1.4 RefundRequest (whole PR)

New leftover requests:

- `supplierId` / `supplierKey` = `none` (sentinel already used)
- Unique active (`PENDING` or `APPROVED`): **one per `purchaseId`** (any supplierKey). If an old per-supplier pending/approved row exists for that PR, treat as blocking.

Keep existing columns (`destination`, snapshot `prTotal` / `actualGoods` / `tax` / `delivery` / `other` / `bill`). For whole-PR leftover:

- `prTotal` = approved grand total (lines + header fees)
- `actualGoods` = sum of receive qty × actual unit price
- `tax` / `delivery` / `other` = **actual** extras (`delivery` stores shipping)
- `bill` = actual goods + actual extras
- `amount` = leftover

`kind` is still implied (PR leftover vs catalog variance on the list). No new enum required.

---

## 2. Formulas

```
approvedGrand = Σ(line.qty × line.price) + tax + shipping + otherFees
actualGoods   = Σ(purchase IN qty × unitPrice)
actualExtras  = (actualTax ?? tax) + (actualShipping ?? shipping) + (actualOtherFees ?? otherFees)
leftover      = max(0, approvedGrand − actualGoods − actualExtras)
```

Partial receive: leftover still uses **full** `approvedGrand`, not only received qty. Warn if any line has remaining qty > 0.

---

## 3. Screens

### 3.1 PR create/edit

Under items: Tax, Shipping, Other. Display line total and **Grand total**. Submit includes the three fees.

### 3.2 PR detail / approval

Show line total, fees, grand total. Receive block: per-line qty + **unit price**; then actual tax / shipping / other; leftover preview; **Submit leftover** if leftover > 0 and no blocking request.

Remove **Supplier settlement** cards.

### 3.3 Refund list `/petty-cash/refunds`

**New refund** (Admin + Finance, `pettyCash:write`): searchable PR, amount default = leftover (user may type **less**, not more), destination, note. Creates `PENDING`.

Pending / Posted / approve / reject unchanged (kas kecil TOP_UP `PR_LEFTOVER`; bank TRANSFER, balance unchanged).

### 3.4 New refund amount

Must be `> 0` and `≤ leftover`. If leftover is 0, cannot create.

---

## 4. Who

| Action | Who |
|---|---|
| Set header fees on PR | `purchasing:write`, until fully approved |
| Receive qty + unit price, save actual extras, submit leftover from PR | `purchasing:receive` (Admin) |
| New refund from list, approve/reject | `pettyCash:write` (Admin, Finance) |

---

## 5. Errors

- Negative fees / prices → 400
- Receive qty > remaining → as today
- Header fee change after approved/rejected → 400
- Leftover ≤ 0 → cannot submit / New refund
- Active leftover already on that PR (including old per-supplier PENDING/APPROVED) → 409
- Reject reason < 3 characters → 400

---

## 6. Tests

- `approvedGrand` includes header fees
- Header fees rejected after full approval
- Receive persists `unitPrice`; `actualGoods` uses it
- Leftover math; overspend → no request
- One active leftover per PR
- New refund from list: amount cap = leftover
- Product catalog `price` unchanged after receive
- Approve kas kecil increases balance; bank TRANSFER does not

---

## 7. Migration

- Add purchase fee columns (estimates + actuals), default 0 / null
- Add `stock_transactions.unitPrice`
- Unique active leftover: prefer one row per `purchaseId` where status in PENDING/APPROVED. Implement in service (findFirst on purchaseId) **and** a partial unique index if Postgres allows one active request per purchase regardless of `supplierKey`. If old per-supplier rows collide, do not auto-merge; 409 until rejected.
