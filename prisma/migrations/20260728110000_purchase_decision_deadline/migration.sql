-- Decision deadline for approve/reject (distinct from goods dateRequired)
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "decisionDeadline" TIMESTAMP(3);

UPDATE "purchases"
SET "decisionDeadline" = "dateRequired"
WHERE "decisionDeadline" IS NULL;

ALTER TABLE "purchases" ALTER COLUMN "decisionDeadline" SET NOT NULL;
