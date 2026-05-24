import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."producto" 
    ADD COLUMN IF NOT EXISTS "modo_volumen" VARCHAR(20) DEFAULT 'unitario'
  `)
  console.log('✅ Campo modo_volumen agregado')
} catch (e) {
  console.error('❌', e.message)
} finally {
  await p.$disconnect()
}
