// ============================================================
// src/modules/clientes/clientes.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './clientes.controller.js'
import { createClienteSchema, updateClienteSchema } from './clientes.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createClienteSchema), auditLog('cliente', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateClienteSchema), auditLog('cliente', 'UPDATE'), controller.update)
router.delete('/:id',authorize('admin'), auditLog('cliente', 'DELETE'), controller.deactivate)

export default router


// ============================================================
// src/modules/clientes/clientes.controller.js
// ============================================================
import * as service from './clientes.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    return successResponse(res, await service.getAll(req.user.empresa_id, req.query))
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    return successResponse(res, await service.create(req.user.empresa_id, req.body), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}

export const deactivate = async (req, res) => {
  try {
    await service.deactivate(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Cliente desactivado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}


// ============================================================
// src/modules/clientes/clientes.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.cliente.findMany({
    where: {
      empresa_id,
      activo: true,
      ...(filters.tipo && { tipo: filters.tipo }),
    },
    orderBy: { nombre: 'asc' },
  })
}

export const getById = async (empresa_id, cliente_id) => {
  const cliente = await prisma.cliente.findFirst({ where: { cliente_id, empresa_id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND')
  return cliente
}

export const create = async (empresa_id, data) => {
  if (data.cedula) {
    const existe = await prisma.cliente.findUnique({ where: { cedula: data.cedula } })
    if (existe) throw new AppError('Ya existe un cliente con esa cédula', 409, 'CEDULA_DUPLICATE')
  }
  return await prisma.cliente.create({ data: { empresa_id, ...data } })
}

export const update = async (empresa_id, cliente_id, data) => {
  const cliente = await prisma.cliente.findFirst({ where: { cliente_id, empresa_id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND')
  return await prisma.cliente.update({ where: { cliente_id }, data })
}

export const deactivate = async (empresa_id, cliente_id) => {
  const cliente = await prisma.cliente.findFirst({ where: { cliente_id, empresa_id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND')
  await prisma.cliente.update({ where: { cliente_id }, data: { activo: false } })
}


// ============================================================
// src/modules/clientes/clientes.schema.js
// ============================================================
import { z } from 'zod'

export const createClienteSchema = z.object({
  body: z.object({
    nombre:        z.string().min(2).max(150),
    cedula:        z.string().max(20).optional(),
    tipo:          z.enum(['nacional', 'exportacion', 'interno']),
    moneda:        z.string().length(3),
    descuento_pct: z.number().min(0).max(100).optional(),
    email:         z.string().email().optional(),
  })
})

export const updateClienteSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    nombre:        z.string().min(2).max(150).optional(),
    tipo:          z.enum(['nacional', 'exportacion', 'interno']).optional(),
    moneda:        z.string().length(3).optional(),
    descuento_pct: z.number().min(0).max(100).optional(),
    email:         z.string().email().optional(),
  })
})
