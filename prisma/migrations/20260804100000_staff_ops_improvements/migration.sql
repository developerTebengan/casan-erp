-- Roles
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'BUYER';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'STOCK_KEEPER';

-- Supplier status enum + fields
DO $$ BEGIN
  CREATE TYPE "supplier_status" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "status" "supplier_status" NOT NULL DEFAULT 'ACTIVE';

-- Warehouses
CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_code_active_key" ON "warehouses"("code") WHERE "deletedAt" IS NULL;

-- Products preferred supplier
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "preferredSupplierId" TEXT;

-- Product stock by warehouse
CREATE TABLE IF NOT EXISTS "product_stocks" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "qty" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_stocks_productId_warehouseId_key" ON "product_stocks"("productId", "warehouseId");

-- Stock transaction type/source extensions
ALTER TYPE "stock_transaction_type" ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE "stock_transaction_source" ADD VALUE IF NOT EXISTS 'CYCLE_COUNT';
ALTER TYPE "stock_transaction_source" ADD VALUE IF NOT EXISTS 'TRANSFER';

ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "reversedFromId" TEXT;

-- Purchase expected delivery
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "expectedDeliveryDate" TIMESTAMP(3);

-- Goods receipts (GRN)
CREATE TABLE IF NOT EXISTS "goods_receipts" (
  "id" TEXT NOT NULL,
  "grnNumber" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_grnNumber_active_key" ON "goods_receipts"("grnNumber") WHERE "deletedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "goods_receipt_lines" (
  "id" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- Cycle counts
DO $$ BEGIN
  CREATE TYPE "cycle_count_status" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "cycle_counts" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "status" "cycle_count_status" NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "createdById" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cycle_counts_code_active_key" ON "cycle_counts"("code") WHERE "deletedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "cycle_count_lines" (
  "id" TEXT NOT NULL,
  "cycleCountId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "systemQty" INTEGER NOT NULL,
  "countedQty" INTEGER NOT NULL,
  "variance" INTEGER NOT NULL,
  CONSTRAINT "cycle_count_lines_pkey" PRIMARY KEY ("id")
);

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- FKs (ignore if already exist)
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_reversedFromId_fkey" FOREIGN KEY ("reversedFromId") REFERENCES "stock_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_cycleCountId_fkey" FOREIGN KEY ("cycleCountId") REFERENCES "cycle_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Seed default warehouse + backfill product stocks
INSERT INTO "warehouses" ("id", "code", "name", "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MAIN', 'Main Warehouse', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "warehouses" WHERE "code" = 'MAIN' AND "deletedAt" IS NULL);

INSERT INTO "product_stocks" ("id", "productId", "warehouseId", "qty")
SELECT gen_random_uuid()::text, p."id", w."id", p."stock"
FROM "products" p
CROSS JOIN "warehouses" w
WHERE w."code" = 'MAIN' AND w."deletedAt" IS NULL AND p."deletedAt" IS NULL
AND NOT EXISTS (
  SELECT 1 FROM "product_stocks" ps WHERE ps."productId" = p."id" AND ps."warehouseId" = w."id"
);
