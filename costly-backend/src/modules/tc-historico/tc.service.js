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

  const cached = await redis.get(TC_CACHE_KEY).catch(() => null)
  if (cached) return { usd_crc: parseFloat(cached), fuente: 'cache', fecha: hoy }

  const tc = await prisma.tc_historico.findFirst({
    where: { empresa_id, fecha: new Date(hoy) },
    orderBy: { creado_en: 'desc' },
  })

  if (!tc) {
    throw new AppError(
      'No hay tipo de cambio registrado para hoy',
      404,
      'TC_NOT_FOUND'
    )
  }

  await redis.setex(TC_CACHE_KEY, TC_TTL, tc.usd_crc.toString()).catch(() => null)
  return tc
}

export const create = async (empresa_id, data) => {
  const tc = await prisma.tc_historico.create({
    data: { empresa_id, ...data, fecha: new Date(data.fecha) },
  })

  const hoy = new Date().toISOString().split('T')[0]
  if (data.fecha === hoy) await redis.del(TC_CACHE_KEY).catch(() => null)

  return tc
}

