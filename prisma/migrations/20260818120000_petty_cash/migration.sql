-- AlterEnum
ALTER TYPE "stock_transaction_source" ADD VALUE 'PETTY_CASH';

-- CreateEnum
CREATE TYPE "petty_cash_type" AS ENUM ('TOP_UP', 'SPEND', 'REFUND');

-- CreateTable
CREATE TABLE "petty_cash_accounts" (
    "id" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_transactions" (
    "id" TEXT NOT NULL,
    "type" "petty_cash_type" NOT NULL,
    "amount" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "expectedAmount" DECIMAL,
    "paidAmount" DECIMAL,
    "catalogUnitPrice" DECIMAL,
    "actualUnitPrice" DECIMAL,
    "qty" INTEGER,
    "productId" TEXT,
    "stockTransactionId" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petty_cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "petty_cash_transactions_type_idx" ON "petty_cash_transactions"("type");

-- CreateIndex
CREATE INDEX "petty_cash_transactions_createdAt_idx" ON "petty_cash_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "petty_cash_accounts" ("id", "balance", "updatedAt") VALUES ('default', 0, CURRENT_TIMESTAMP);
