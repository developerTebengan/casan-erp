# CSV date/type filters, edit petty-cash top-up, supplier–product catalog

Date: 2026-08-18  
App: Casan ERP 0.6.1

## Goal

Stock movement CSV can be filtered by date and type. Admin/Finance can fix a posted **top-up**. Each supplier can list the products they sell, and each product can list its suppliers.

## Locked decisions

- Stock list + export share From / To (inclusive, Asia/Jakarta calendar day) and Type (IN / OUT / ADJ). Filename stays `.csv` (UTF-8 BOM).
- Petty cash **A**: edit a `TOP_UP` amount or note only. Replay the ledger. Reject if a later spend would go below zero. Spends and refunds stay locked.
- `product_suppliers` join (`productId` + `supplierId` unique). Add/remove from supplier detail and product detail. PR lines still allow any supplier; if the product has links and the line supplier is empty, default to the first linked supplier.

## Out of scope

- Editing spends or setting a raw balance
- New report module
- Creating a new product or supplier inline on the other form
