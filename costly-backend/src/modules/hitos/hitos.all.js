// ============================================================
// src/modules/hitos/hitos.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './hitos.controller.js'
import { createHitoSchema, updateHitoSchema } from './hitos.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createHitoSchema), auditLog('hito', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateHitoSchema), auditLog('hito', 'UPDATE'), controller.update)

export default router


// ============================================================
// src/modules/hitos/hitos.controller.js
// ============================================================
import * as service from './hitos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await service.create(req.user.empresa_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const update = async (req, res) => {
  try { return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body)) }
  catch (error) { return errorResponse(res, error) }
}


// ============================================================
// src/modules/hitos/hitos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { calcularSemaforo } from '../../utils/fecha.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  const hitos = await prisma.hito.findMany({
    where: {
      pedido: { empresa_id },
      ...(filters.pedido_id  && { pedido_id: parseInt(filters.pedido_id) }),
      ...(filters.estado     && { estado: filters.estado }),
    },
    include: {
      pedido:      { select: { codigo: true } },
      responsable: { select: { nombre: true } },
    },
    orderBy: { fecha_plan: 'asc' },
  })

  // Agregar semáforo calculado a cada hito
  return hitos.map(h => ({
    ...h,
    semaforo: h.estado === 'completado' ? 'verde' : calcularSemaforo(h.fecha_plan)
  }))
}

export const create = async (empresa_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  return await prisma.hito.create({ data })
}

export const update = async (empresa_id, hito_id, data) => {
  const hito = await prisma.hito.findFirst({
    where: { hito_id, pedido: { empresa_id } }
  })
  if (!hito) throw new AppError('Hito no encontrado', 404, 'HITO_NOT_FOUND')

  // Si se marca como completado, registrar fecha real automáticamente
  const updateData = { ...data }
  if (data.estado === 'completado' && !data.fecha_real) {
    updateData.fecha_real = new Date()
  }

  return await prisma.hito.update({ where: { hito_id }, data: updateData })
}


// ============================================================
// src/modules/hitos/hitos.schema.js
// ============================================================
import { z } from 'zod'

export const createHitoSchema = z.object({
  body: z.object({
    pedido_id:       z.number().int().positive(),
    responsable_id:  z.number().int().positive().optional(),
    tipo:            z.enum(['confirmacion', 'pago_senal', 'produccion', 'embarque', 'llegada_cr', 'retiro_aduana', 'entrega_bodega', 'entrega_cliente', 'personalizado']),
    fecha_plan:      z.string().datetime().optional(),
    nota:            z.string().optional(),
  })
})

export const updateHitoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    estado:         z.enum(['pendiente', 'en_proceso', 'completado', 'vencido']).optional(),
    fecha_plan:     z.string().datetime().optional(),
    fecha_real:     z.string().datetime().optional(),
    nota:           z.string().optional(),
    responsable_id: z.number().int().positive().optional(),
  })
})
