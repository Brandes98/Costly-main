import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Ejecutando seed...')

  // ── Empresa
  const empresa = await prisma.empresa.upsert({
    where: { ruc: '3-101-XXXXXX' },
    update: {},
    create: {
      nombre:        'Distribuidora de Servicios Vadibarot Ltda.',
      ruc:           '3-101-XXXXXX',
      moneda_base:   'USD',
      margen_default: 30,
      iva_pct:       13,
      ivi_pct:       13,
      tc_fuente:     'bccr',
    }
  })
  console.log(`✅ Empresa: ${empresa.nombre}`)

  // ── Usuario admin
  const passwordHash = await bcrypt.hash('Admin1234!', 12)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@vadibarot.com' },
    update: {},
    create: {
      empresa_id:    empresa.empresa_id,
      nombre:        'Administrador',
      email:         'admin@vadibarot.com',
      password_hash: passwordHash,
      rol:           'admin',
      activo:        true,
    }
  })
  console.log(`✅ Usuario admin: ${admin.email}`)

  // ── Países más comunes para Vadibarot
  const paises = [
    { codigo: 'CR', nombre: 'Costa Rica',      bandera: '🇨🇷' },
    { codigo: 'US', nombre: 'Estados Unidos',  bandera: '🇺🇸' },
    { codigo: 'CN', nombre: 'China',           bandera: '🇨🇳' },
    { codigo: 'DE', nombre: 'Alemania',        bandera: '🇩🇪' },
    { codigo: 'MX', nombre: 'México',          bandera: '🇲🇽' },
    { codigo: 'ES', nombre: 'España',          bandera: '🇪🇸' },
    { codigo: 'JP', nombre: 'Japón',           bandera: '🇯🇵' },
    { codigo: 'BR', nombre: 'Brasil',          bandera: '🇧🇷' },
    { codigo: 'KR', nombre: 'Corea del Sur',   bandera: '🇰🇷' },
    { codigo: 'TW', nombre: 'Taiwán',          bandera: '🇹🇼' },
  ]

  for (const pais of paises) {
    await prisma.pais.upsert({
      where: { codigo: pais.codigo },
      update: {},
      create: pais,
    })
  }
  console.log(`✅ ${paises.length} países creados`)

  console.log('\n🎉 Seed completado!')
  console.log('─────────────────────────────────')
  console.log('  Email:     admin@vadibarot.com')
  console.log('  Password:  Admin1234!')
  console.log('  ⚠️  Cambiar la contraseña después del primer login')
  console.log('─────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
