-- Add creado_en column to pago table
ALTER TABLE "pago" ADD COLUMN "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Optional: If you want to backfill existing records (though table is empty after reset)
-- UPDATE "pago" SET "creado_en" = "registrado_en" WHERE "creado_en" IS NULL;