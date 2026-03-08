import redis from '../config/redis.js'
import prisma from '../config/database.js'

const TC_CACHE_KEY = 'tc:usd_crc:hoy'
const TC_TTL_SEGUNDOS = 60 * 60 * 4 // 4 horas

// Obtener tipo de cambio del día (cache Redis → BD → error)
export const getTCHoy = async (empresa_id) => {
  // 1. Intentar desde cache
  const cached = await redis.get(TC_CACHE_KEY)
  if (cached) return parseFloat(cached)

  // 2. Buscar en BD
  const hoy = new Date().toISOString().split('T')[0]
  const tc = await prisma.tc_historico.findFirst({
    where: { empresa_id, fecha: new Date(hoy) },
    orderBy: { creado_en: 'desc' },
  })

  if (!tc) throw new Error('No hay tipo de cambio registrado para hoy')

  // 3. Guardar en cache
  await redis.setex(TC_CACHE_KEY, TC_TTL_SEGUNDOS, tc.usd_crc.toString())
  return parseFloat(tc.usd_crc)
}

// Convertir USD a CRC
export const usdToCrc = (monto, tc) => {
  return parseFloat((monto * tc).toFixed(2))
}

// Convertir CRC a USD
export const crcToUsd = (monto, tc) => {
  return parseFloat((monto / tc).toFixed(4))
}

// Redondear a 2 decimales
export const redondear = (valor, decimales = 2) => {
  return parseFloat(valor.toFixed(decimales))
}
