CREATE TABLE "company_settings" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "taxId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  "itemsPerPage" INTEGER NOT NULL DEFAULT 10,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "company_settings" ("id","companyName","email","phone","taxId","address","currency","dateFormat","itemsPerPage","updatedAt")
VALUES ('default','Casan ERP Indonesia','info@casanerp.com','021-555-1234','1234567890','Jl. Sudirman No. 123, Jakarta','IDR','DD/MM/YYYY',10, NOW());
