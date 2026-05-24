import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  // 1. Agregar enum TipoCosteo
  await p.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "public"."TipoCosteo" AS ENUM ('real', 'aproximacion');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  console.log('✅ Enum TipoCosteo creado')

  // 2. Agregar campo tipo a costeo
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."costeo"
    ADD COLUMN IF NOT EXISTS "tipo" "public"."TipoCosteo" NOT NULL DEFAULT 'real'
  `)
  console.log('✅ Campo tipo agregado')

  // 3. Tabla intermedia costeo_pedido para aproximaciones
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."costeo_pedido" (
      "cp_id"     SERIAL PRIMARY KEY,
      "costeo_id" INT NOT NULL,
      "pedido_id" INT NOT NULL,
      "creado_en" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "costeo_pedido_costeo_fkey"  FOREIGN KEY ("costeo_id") REFERENCES "public"."costeo"("costeo_id")  ON DELETE CASCADE,
      CONSTRAINT "costeo_pedido_pedido_fkey"  FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("pedido_id")  ON DELETE CASCADE,
      CONSTRAINT "costeo_pedido_unique"       UNIQUE ("costeo_id", "pedido_id")
    )
  `)
  console.log('✅ Tabla costeo_pedido creada')

} catch (e) {
  console.error('❌ Error:', e.message)
} finally {
  await p.$disconnect()
}
