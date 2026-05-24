// fix_caja_medidas.mjs
// Ejecutar: node fix_caja_medidas.mjs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE producto
      ADD COLUMN IF NOT EXISTS largo_caja_cm  DECIMAL(18,2),
      ADD COLUMN IF NOT EXISTS ancho_caja_cm  DECIMAL(18,2),
      ADD COLUMN IF NOT EXISTS alto_caja_cm   DECIMAL(18,2);
  `)
  console.log('✅ producto: largo_caja_cm, ancho_caja_cm, alto_caja_cm agregados')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
