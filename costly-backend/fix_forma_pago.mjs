// fix_forma_pago.mjs
// Ejecutar: node fix_forma_pago.mjs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE pedido
      ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(20);
  `)
  console.log('✅ pedido: forma_pago VARCHAR(20) agregado')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
