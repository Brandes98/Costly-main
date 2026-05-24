// fix_volumen_precision.mjs
// Ejecutar: node fix_volumen_precision.mjs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // producto — dimensiones, peso y volumen
  await prisma.$executeRawUnsafe(`
    ALTER TABLE producto
      ALTER COLUMN volumen_m3        TYPE DECIMAL(18, 6),
      ALTER COLUMN volumen_caja_m3   TYPE DECIMAL(18, 6),
      ALTER COLUMN peso_kg           TYPE DECIMAL(18, 3),
      ALTER COLUMN peso_caja_kg      TYPE DECIMAL(18, 3),
      ALTER COLUMN pallet_peso_max_kg TYPE DECIMAL(18, 3),
      ALTER COLUMN largo_cm          TYPE DECIMAL(18, 2),
      ALTER COLUMN ancho_cm          TYPE DECIMAL(18, 2),
      ALTER COLUMN alto_cm           TYPE DECIMAL(18, 2),
      ALTER COLUMN pallet_largo_cm   TYPE DECIMAL(18, 2),
      ALTER COLUMN pallet_ancho_cm   TYPE DECIMAL(18, 2),
      ALTER COLUMN pallet_alto_max_cm TYPE DECIMAL(18, 2);
  `)
  console.log('✅ producto: dimensiones, pesos y volúmenes actualizados')

  // linea_pedido
  await prisma.$executeRawUnsafe(`
    ALTER TABLE linea_pedido
      ALTER COLUMN volumen_total_m3 TYPE DECIMAL(18, 6),
      ALTER COLUMN peso_total_kg    TYPE DECIMAL(18, 3),
      ALTER COLUMN pallet_largo_cm  TYPE DECIMAL(18, 2),
      ALTER COLUMN pallet_ancho_cm  TYPE DECIMAL(18, 2),
      ALTER COLUMN pallet_alto_max_cm TYPE DECIMAL(18, 2),
      ALTER COLUMN pallet_peso_max_kg TYPE DECIMAL(18, 3);
  `)
  console.log('✅ linea_pedido: dimensiones y volúmenes actualizados')

  // proyeccion_volumen
  await prisma.$executeRawUnsafe(`
    ALTER TABLE proyeccion_volumen
      ALTER COLUMN volumen_total_m3 TYPE DECIMAL(18, 6),
      ALTER COLUMN peso_total_kg    TYPE DECIMAL(18, 3);
  `)
  console.log('✅ proyeccion_volumen: volúmenes actualizados')

  // proyeccion_detalle
  await prisma.$executeRawUnsafe(`
    ALTER TABLE proyeccion_detalle
      ALTER COLUMN volumen_m3 TYPE DECIMAL(18, 6),
      ALTER COLUMN peso_kg    TYPE DECIMAL(18, 3);
  `)
  console.log('✅ proyeccion_detalle: volúmenes actualizados')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
