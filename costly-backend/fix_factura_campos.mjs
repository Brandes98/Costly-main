import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."factura_prov"
    ADD COLUMN IF NOT EXISTS "nota"       TEXT,
    ADD COLUMN IF NOT EXISTS "archivo_url" VARCHAR(500)
  `)
  console.log('✅ Campos nota y archivo_url agregados a factura_prov')
} catch (e) {
  console.error('❌', e.message)
} finally {
  await p.$disconnect()
}
