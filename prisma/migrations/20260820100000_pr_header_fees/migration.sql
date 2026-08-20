-- AlterTable
ALTER TABLE "purchases" ADD COLUMN "tax" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "purchases" ADD COLUMN "shipping" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "purchases" ADD COLUMN "otherFees" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "purchases" ADD COLUMN "actualTax" DECIMAL;
ALTER TABLE "purchases" ADD COLUMN "actualShipping" DECIMAL;
ALTER TABLE "purchases" ADD COLUMN "actualOtherFees" DECIMAL;

-- AlterTable
ALTER TABLE "stock_transactions" ADD COLUMN "unitPrice" DECIMAL;
