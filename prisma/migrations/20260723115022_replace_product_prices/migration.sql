-- AlterTable
ALTER TABLE "products" ADD COLUMN     "price" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- MigrateData
UPDATE "products" SET "price" = "purchasePrice";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "purchasePrice",
DROP COLUMN "sellingPrice";
