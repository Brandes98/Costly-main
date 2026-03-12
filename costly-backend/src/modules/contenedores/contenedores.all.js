// ============================================================
// src/modules/contenedores/contenedores.all.js
// ============================================================

// ── contenedores.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './contenedores.controller.js'
import { createContenedorSchema, updateContenedorSchema } from './contenedores.schema.js'

const router = Router()
router.use(authenticate)

router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createContenedorSchema), auditLog('contenedor', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateContenedorSchema), auditLog('contenedor', 'UPDATE'), controller.update)

export default router

// ── contenedores.controller.js
import * as service from './contenedores.service.js'
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
  try { return successResponse(res, await service.create(req.user.empresa_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const update = async (req, res) => {
  try { return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body)) }
  catch (error) { return errorResponse(res, error) }
}

// ── contenedores.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.contenedor.findMany({
    where: {
      importacion: { empresa_id },
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.importacion_id && { importacion_id: parseInt(filters.importacion_id) }),
    },
    include: { importacion: { select: { codigo: true } } },
    orderBy: { contenedor_id: 'desc' },
  })
}

export const getById = async (empresa_id, contenedor_id) => {
  const contenedor = await prisma.contenedor.findFirst({
    where: { contenedor_id, importacion: { empresa_id } },
    include: { importacion: true },
  })
  if (!contenedor) throw new AppError('Contenedor no encontrado', 404, 'CONTENEDOR_NOT_FOUND')
  return contenedor
}

export const create = async (empresa_id, data) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id: data.importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  return await prisma.contenedor.create({ data })
}

export const update = async (empresa_id, contenedor_id, data) => {
  const contenedor = await prisma.contenedor.findFirst({ where: { contenedor_id, importacion: { empresa_id } } })
  if (!contenedor) throw new AppError('Contenedor no encontrado', 404, 'CONTENEDOR_NOT_FOUND')
  return await prisma.contenedor.update({ where: { contenedor_id }, data })
}

// ── contenedores.schema.js
import { z } from 'zod'

export const createContenedorSchema = z.object({
  body: z.object({
    importacion_id: z.number().int().positive(),
    codigo: z.string().min(1).max(20),
    tipo: z.enum(['GP20', 'GP40', 'HC40', 'LCL', 'aereo']).optional(),
    naviera: z.string().max(80).optional(),
    bl_numero: z.string().max(60).optional(),
    puerto_origen: z.string().max(80).optional(),
    puerto_destino: z.string().max(80).optional(),
    fecha_salida: z.string().datetime().optional(),
    eta_cr: z.string().datetime().optional(),
  })
})

export const updateContenedorSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: createContenedorSchema.shape.body.omit({ importacion_id: true }).partial().extend({
    estado: z.enum(['programado', 'pre_embarque', 'en_transito', 'en_puerto', 'en_aduana', 'en_bodega', 'retirado']).optional(),
    fecha_arribo: z.string().datetime().optional(),
  })
})
