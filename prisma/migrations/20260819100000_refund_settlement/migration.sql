-- AlterEnum
ALTER TYPE "petty_cash_type" ADD VALUE 'TRANSFER';

-- CreateEnum
CREATE TYPE "source_of_fund" AS ENUM ('CASH', 'BANK_TRANSFER', 'DIRECTOR', 'REVENUE', 'OTHER', 'PR_LEFTOVER');

-- CreateEnum
CREATE TYPE "refund_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "refund_destination" AS ENUM ('KAS_KECIL', 'BANK');

-- AlterTable
ALTER TABLE "petty_cash_transactions" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "petty_cash_transactions" ADD COLUMN "sourceOfFund" "source_of_fund";

-- CreateTable
CREATE TABLE "purchase_supplier_settlements" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierKey" TEXT NOT NULL,
    "actualGoods" DECIMAL NOT NULL,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "delivery" DECIMAL NOT NULL DEFAULT 0,
    "other" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_supplier_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "status" "refund_request_status" NOT NULL DEFAULT 'PENDING',
    "destination" "refund_destination" NOT NULL,
    "amount" DECIMAL NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierKey" TEXT NOT NULL,
    "pettyCashTransactionId" TEXT,
    "prTotal" DECIMAL NOT NULL,
    "actualGoods" DECIMAL NOT NULL,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "delivery" DECIMAL NOT NULL DEFAULT 0,
    "other" DECIMAL NOT NULL DEFAULT 0,
    "bill" DECIMAL NOT NULL,
    "rejectReason" TEXT,
    "createdBy" TEXT,
    "decidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_supplier_settlements_purchaseId_supplierKey_key" ON "purchase_supplier_settlements"("purchaseId", "supplierKey");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_pettyCashTransactionId_key" ON "refund_requests"("pettyCashTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_purchaseId_supplierKey_active_key" ON "refund_requests"("purchaseId", "supplierKey") WHERE status IN ('PENDING', 'APPROVED');

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_createdAt_idx" ON "refund_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_supplier_settlements" ADD CONSTRAINT "purchase_supplier_settlements_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_supplier_settlements" ADD CONSTRAINT "purchase_supplier_settlements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_pettyCashTransactionId_fkey" FOREIGN KEY ("pettyCashTransactionId") REFERENCES "petty_cash_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
