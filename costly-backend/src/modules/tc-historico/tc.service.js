import prisma from '../../config/database.js'
import redis from '../../config/redis.js'
import { AppError } from '../../utils/response.utils.js'

const TC_CACHE_KEY = 'tc:usd_crc:hoy'
const TC_TTL = 60 * 60 * 4 // 4 horas

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.tc_historico.findMany({
    where: {
      empresa_id,
      ...(filters.desde && { fecha: { gte: new Date(filters.desde) } }),
      ...(filters.hasta && { fecha: { lte: new Date(filters.hasta) } }),
    },
    orderBy: { fecha: 'desc' },
    take: parseInt(filters.limit) || 30,
  })
}

export const getHoy = async (empresa_id) => {
  const hoy = new Date().toISOString().split('T')[0]

  // 1. Caché Redis
  const cached = await redis.get(TC_CACHE_KEY).catch(() => null)
  if (cached) return { usd_crc: parseFloat(cached), fuente: 'bccr', fecha: hoy, valor: parseFloat(cached) }

  // 2. BD del día
  const tc = await prisma.tc_historico.findFirst({
    where:   { empresa_id, fecha: new Date(hoy) },
    orderBy: { creado_en: 'desc' },
  })
  if (tc) {
    await redis.setex(TC_CACHE_KEY, TC_TTL, tc.usd_crc.toString()).catch(() => null)
    return { ...tc, valor: Number(tc.usd_crc) }
  }

  // 3. Consultar open.er-api.com
  try {
    const resp = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) throw new Error('API no disponible')

    const data  = await resp.json()
    const valor = parseFloat(data.rates?.CRC || 0)
    if (!valor) throw new Error('TC inválido')

    // Guardar en BD con fuente válida del enum
    const nuevo = await prisma.tc_historico.create({
      data: { empresa_id, fecha: new Date(hoy), usd_crc: valor, fuente: 'bccr' }
    })
    await redis.setex(TC_CACHE_KEY, TC_TTL, valor.toString()).catch(() => null)
    return { ...nuevo, valor }

  } catch (e) {
    // 4. Fallback: último TC guardado
    const ultimo = await prisma.tc_historico.findFirst({
      where:   { empresa_id },
      orderBy: { fecha: 'desc' }
    })
    if (ultimo) return { ...ultimo, valor: Number(ultimo.usd_crc), advertencia: 'TC desactualizado' }
    throw new AppError('No se pudo obtener el tipo de cambio', 503, 'TC_NO_DISPONIBLE')
  }
}

export const create = async (empresa_id, data) => {
  const tc = await prisma.tc_historico.create({
    data: { empresa_id, ...data, fecha: new Date(data.fecha) },
  })

  const hoy = new Date().toISOString().split('T')[0]
  if (data.fecha === hoy) await redis.del(TC_CACHE_KEY).catch(() => null)

  return tc
}

