import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  // Quitar el unique constraint actual de sku solo
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."producto" DROP CONSTRAINT IF EXISTS "producto_sku_key"
  `)
  console.log('✅ Constraint anterior eliminado')

  // Agregar unique por (empresa_id, sku)
  await p.$executeRawUnsafe(`
    ALTER TABLE "public"."producto" 
    ADD CONSTRAINT "producto_empresa_sku_unique" UNIQUE ("empresa_id", "sku")
  `)
  console.log('✅ Nuevo constraint (empresa_id, sku) creado')

} catch (e) {
  console.error('❌', e.message)
} finally {
  await p.$disconnect()
}
