// ============================================================
// src/modules/proveedores/proveedores.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './proveedores.controller.js'
import { createProveedorSchema, updateProveedorSchema } from './proveedores.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createProveedorSchema), auditLog('proveedor', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateProveedorSchema), auditLog('proveedor', 'UPDATE'), controller.update)
router.delete('/:id',authorize('admin'), auditLog('proveedor', 'DELETE'), controller.deactivate)

export default router


// ============================================================
// src/modules/proveedores/proveedores.controller.js
// ============================================================
import * as service from './proveedores.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    const data = await service.getAll(req.user.empresa_id, req.query)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    const data = await service.getById(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    const data = await service.create(req.user.empresa_id, req.body)
    return successResponse(res, data, 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    const data = await service.update(req.user.empresa_id, parseInt(req.params.id), req.body)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const deactivate = async (req, res) => {
  try {
    await service.deactivate(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Proveedor desactivado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}


// ============================================================
// src/modules/proveedores/proveedores.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.proveedor.findMany({
    where: {
      empresa_id,
      activo: true,
      ...(filters.pais_id && { pais_id: parseInt(filters.pais_id) }),
    },
    include: { pais: { select: { codigo: true, nombre: true, bandera: true } } },
    orderBy: { nombre: 'asc' },
  })
}

export const getById = async (empresa_id, proveedor_id) => {
  const proveedor = await prisma.proveedor.findFirst({
    where: { proveedor_id, empresa_id },
    include: { pais: true },
  })
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')
  return proveedor
}

export const create = async (empresa_id, data) => {
  const pais = await prisma.pais.findUnique({ where: { pais_id: data.pais_id } })
  if (!pais) throw new AppError('País no encontrado', 404, 'PAIS_NOT_FOUND')

  return await prisma.proveedor.create({
    data: { empresa_id, ...data },
    include: { pais: { select: { codigo: true, nombre: true, bandera: true } } },
  })
}

export const update = async (empresa_id, proveedor_id, data) => {
  const proveedor = await prisma.proveedor.findFirst({ where: { proveedor_id, empresa_id } })
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')

  return await prisma.proveedor.update({
    where: { proveedor_id },
    data,
    include: { pais: { select: { codigo: true, nombre: true, bandera: true } } },
  })
}

export const deactivate = async (empresa_id, proveedor_id) => {
  const proveedor = await prisma.proveedor.findFirst({ where: { proveedor_id, empresa_id } })
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')

  const pedidosActivos = await prisma.pedido.count({
    where: { proveedor_id, estado: { notIn: ['cerrado', 'cancelado'] } }
  })
  if (pedidosActivos > 0) {
    throw new AppError('No se puede desactivar un proveedor con pedidos activos', 400, 'PROVEEDOR_CON_PEDIDOS')
  }

  await prisma.proveedor.update({ where: { proveedor_id }, data: { activo: false } })
}


// ============================================================
// src/modules/proveedores/proveedores.schema.js
// ============================================================
import { z } from 'zod'

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']

export const createProveedorSchema = z.object({
  body: z.object({
    pais_id:          z.number().int().positive(),
    nombre:           z.string().min(2).max(150),
    ciudad:           z.string().max(100).optional(),
    incoterm_pref:    z.enum(INCOTERMS).optional(),
    moneda:           z.string().length(3),
    dias_transito:    z.number().int().positive().optional(),
    puerto_origen:    z.string().max(80).optional(),
    condiciones_pago: z.string().max(100).optional(),
    contacto:         z.string().max(100).optional(),
    email:            z.string().email().optional(),
  })
})

export const updateProveedorSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    nombre:           z.string().min(2).max(150).optional(),
    ciudad:           z.string().max(100).optional(),
    incoterm_pref:    z.enum(INCOTERMS).optional(),
    moneda:           z.string().length(3).optional(),
    dias_transito:    z.number().int().positive().optional(),
    puerto_origen:    z.string().max(80).optional(),
    condiciones_pago: z.string().max(100).optional(),
    contacto:         z.string().max(100).optional(),
    email:            z.string().email().optional(),
  })
})
