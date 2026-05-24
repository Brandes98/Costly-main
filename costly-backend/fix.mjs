import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
await p.$executeRawUnsafe('ALTER TABLE pedido ADD COLUMN IF NOT EXISTS nota VARCHAR(300)')
console.log('✅ Columna nota agregada')
await p.$disconnect()