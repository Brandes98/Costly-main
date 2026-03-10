// ============================================================
// src/modules/tc-historico/tc.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import * as controller from './tc.controller.js'
import { createTCSchema } from './tc.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/hoy',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getHoy)
router.post('/',     authorize('finanzas', 'admin'), validate(createTCSchema), controller.create)

export default router

// ── tc.controller.js
import * as service from './tc.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const getHoy = async (req, res) => {
  try { return successResponse(res, await service.getHoy(req.user.empresa_id)) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await service.create(req.user.empresa_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}

// ── tc.service.js
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

  // Intentar desde cache
  const cached = await redis.get(TC_CACHE_KEY).catch(() => null)
  if (cached) return { usd_crc: parseFloat(cached), fuente: 'cache', fecha: hoy }

  // Buscar en BD
  const tc = await prisma.tc_historico.findFirst({
    where: { empresa_id, fecha: new Date(hoy) },
    orderBy: { creado_en: 'desc' },
  })
  if (!tc) throw new AppError('No hay tipo de cambio registrado para hoy', 404, 'TC_NOT_FOUND')

  // Guardar en cache
  await redis.setex(TC_CACHE_KEY, TC_TTL, tc.usd_crc.toString()).catch(() => null)
  return tc
}

export const create = async (empresa_id, data) => {
  const tc = await prisma.tc_historico.create({
    data: { empresa_id, ...data, fecha: new Date(data.fecha) }
  })
  // Invalidar cache si es de hoy
  const hoy = new Date().toISOString().split('T')[0]
  if (data.fecha === hoy) await redis.del(TC_CACHE_KEY).catch(() => null)
  return tc
}

// ── tc.schema.js
import { z } from 'zod'

export const createTCSchema = z.object({
  body: z.object({
    fecha:    z.string().datetime(),
    usd_crc:  z.number().positive(),
    eur_crc:  z.number().positive().optional(),
    eur_usd:  z.number().positive().optional(),
    fuente:   z.enum(['bccr', 'manual', 'hacienda']).default('manual'),
  })
})
