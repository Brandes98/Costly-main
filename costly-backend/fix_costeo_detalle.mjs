import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  // 1. Tabla costeo_detalle — notas por campo
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."costeo_detalle" (
      "detalle_id"  SERIAL PRIMARY KEY,
      "costeo_id"   INT NOT NULL,
      "campo"       VARCHAR(60) NOT NULL,
      "nota"        TEXT,
      "creado_en"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "costeo_detalle_costeo_fkey" FOREIGN KEY ("costeo_id") REFERENCES "public"."costeo"("costeo_id") ON DELETE CASCADE,
      CONSTRAINT "costeo_detalle_unique" UNIQUE ("costeo_id", "campo")
    )
  `)
  console.log('✅ Tabla costeo_detalle creada')

  // 2. Agregar campo "campo" a documento para saber a qué sección pertenece
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."documento"
    ADD COLUMN IF NOT EXISTS "campo" VARCHAR(60)
  `)
  console.log('✅ Campo "campo" agregado a documento')

} catch (e) {
  console.error('❌', e.message)
} finally {
  await p.$disconnect()
}
