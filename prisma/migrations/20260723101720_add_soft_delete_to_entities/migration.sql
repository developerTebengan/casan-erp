-- DropIndex
DROP INDEX "categories_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name") WHERE ("deletedAt" IS NULL);

-- DropIndex
DROP INDEX "products_code_key";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code") WHERE ("deletedAt" IS NULL);

-- DropIndex
DROP INDEX "purchases_prNumber_key";

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_prNumber_key" ON "purchases"("prNumber") WHERE ("deletedAt" IS NULL);

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stock_transactions" ADD COLUMN     "deletedAt" TIMESTAMP(3);
