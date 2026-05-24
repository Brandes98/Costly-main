import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."contenedor"
    ADD COLUMN IF NOT EXISTS "nota" TEXT
  `)
  console.log('✅ Campo nota agregado a contenedor')
} catch (e) {
  console.error('❌', e.message)
} finally {
  await p.$disconnect()
}
