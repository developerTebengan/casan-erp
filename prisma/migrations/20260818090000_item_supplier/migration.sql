ALTER TABLE "purchase_items" ADD COLUMN "supplierId" TEXT;

UPDATE "purchase_items" AS pi
SET "supplierId" = p."supplierId"
FROM "purchases" AS p
WHERE pi."purchaseId" = p."id"
  AND p."supplierId" IS NOT NULL;

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "purchase_items_supplierId_idx" ON "purchase_items"("supplierId");
