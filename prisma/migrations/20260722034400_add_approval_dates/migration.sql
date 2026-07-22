-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "departmentHeadApprovedAt" TIMESTAMP(3),
ADD COLUMN     "finalApprovedAt" TIMESTAMP(3),
ADD COLUMN     "financeApprovedAt" TIMESTAMP(3);
