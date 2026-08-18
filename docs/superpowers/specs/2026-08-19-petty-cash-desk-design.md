# Petty cash cash-desk UX

Date: 2026-08-19  
App: Casan ERP 0.6.2

## Goal

Make `/petty-cash` the daily cash desk: filter and export the ledger, buy stock from that page, and default amount paid to catalog total.

## Locked

- Ledger filters: From, To (inclusive Asia/Jakarta days), Type (All / Top up / Spend / Refund). List and CSV share them.
- CSV: `petty-cash-ledger.csv` via `GET /api/petty-cash?export=1`.
- **Buy with petty cash** on this page only if the user has `stock:write` (Admin). Finance still tops up only.
- On `/stock/petty-cash`, amount paid follows catalog total until the user types a different paid amount. Changing product or qty updates paid only if it still matches the previous catalog total (or is empty).

## Out of scope

- Non-stock cash-out
- Voiding spends
