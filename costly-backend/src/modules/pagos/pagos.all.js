// ============================================================
// src/modules/pagos/pagos.all.js
// ============================================================

// ── pagos.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './pagos.controller.js'
import { createPagoSchema } from './pagos.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',                 authorize('finanzas', 'operador_sr', 'admin'), controller.getAll)
router.get('/:id',              authorize('finanzas', 'operador_sr', 'admin'), controller.getById)
router.post('/',                authorize('finanzas', 'operador_sr', 'admin'), validate(createPagoSchema), auditLog('pago', 'INSERT'), controller.create)
router.patch('/:id/confirmar',  authorize('finanzas', 'admin'), auditLog('pago', 'UPDATE'), controller.confirmar)

export default router

// ── pagos.controller.js
import * as service from './pagos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const getById = async (req, res) => {
  try { return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id))) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await service.create(req.user.empresa_id, req.user.usuario_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const confirmar = async (req, res) => {
  try { return successResponse(res, await service.confirmar(req.user.empresa_id, parseInt(req.params.id))) }
  catch (error) { return errorResponse(res, error) }
}

// ── pagos.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.pago.findMany({
    where: {
      pedido: { empresa_id },
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.proveedor_id && { proveedor_id: parseInt(filters.proveedor_id) }),
    },
    include: {
      pedido:    { select: { codigo: true } },
      proveedor: { select: { nombre: true } },
    },
    orderBy: { fecha_pago: 'desc' },
  })
}

export const getById = async (empresa_id, pago_id) => {
  const pago = await prisma.pago.findFirst({
    where: { pago_id, pedido: { empresa_id } },
    include: { pedido: true, proveedor: true },
  })
  if (!pago) throw new AppError('Pago no encontrado', 404, 'PAGO_NOT_FOUND')
  return pago
}

export const create = async (empresa_id, usuario_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  return await prisma.pago.create({
    data: { ...data, registrado_por: usuario_id, estado: 'programado' }
  })
}

export const confirmar = async (empresa_id, pago_id) => {
  const pago = await prisma.pago.findFirst({ where: { pago_id, pedido: { empresa_id } } })
  if (!pago) throw new AppError('Pago no encontrado', 404, 'PAGO_NOT_FOUND')
  return await prisma.pago.update({ where: { pago_id }, data: { estado: 'confirmado' } })
}

// ── pagos.schema.js
import { z } from 'zod'

export const createPagoSchema = z.object({
  body: z.object({
    pedido_id:      z.number().int().positive(),
    proveedor_id:   z.number().int().positive(),
    tipo:           z.enum(['senal', 'saldo', 'total', 'anticipo', 'devolucion']),
    monto:          z.number().positive(),
    moneda:         z.string().length(3),
    tc_usado:       z.number().positive().optional(),
    fecha_pago:     z.string().datetime(),
    fecha_limite:   z.string().datetime().optional(),
    metodo:         z.enum(['swift', 'transferencia_local', 'cheque', 'efectivo']).optional(),
    referencia:     z.string().max(100).optional(),
    comprobante_url:z.string().url().optional(),
  })
})
