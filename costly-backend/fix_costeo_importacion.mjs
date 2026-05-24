import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  // 1. Hacer importacion_id opcional
  await p.$executeRawUnsafe(`ALTER TABLE "public"."costeo" ALTER COLUMN "importacion_id" DROP NOT NULL`)
  console.log('✅ importacion_id ahora es opcional')

  // 2. Crear tabla intermedia
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."costeo_importacion" (
      "ci_id"          SERIAL PRIMARY KEY,
      "costeo_id"      INT NOT NULL,
      "importacion_id" INT NOT NULL,
      "creado_en"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "costeo_importacion_costeo_fkey"      FOREIGN KEY ("costeo_id")      REFERENCES "public"."costeo"("costeo_id")           ON DELETE CASCADE,
      CONSTRAINT "costeo_importacion_imp_fkey"         FOREIGN KEY ("importacion_id") REFERENCES "public"."importacion"("importacion_id") ON DELETE CASCADE,
      CONSTRAINT "costeo_importacion_unique"           UNIQUE ("costeo_id", "importacion_id")
    )
  `)
  console.log('✅ Tabla costeo_importacion creada')

  // 3. Migrar datos existentes
  await p.$executeRawUnsafe(`
    INSERT INTO "public"."costeo_importacion" ("costeo_id", "importacion_id")
    SELECT "costeo_id", "importacion_id"
    FROM "public"."costeo"
    WHERE "importacion_id" IS NOT NULL
    ON CONFLICT DO NOTHING
  `)
  console.log('✅ Datos existentes migrados')

} catch (e) {
  console.error('❌ Error:', e.message)
} finally {
  await p.$disconnect()
}
