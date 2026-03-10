// ============================================================
// src/modules/importaciones/importaciones.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './importaciones.controller.js'
import { updateImportacionSchema } from './importaciones.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateImportacionSchema), auditLog('importacion', 'UPDATE'), controller.update)

export default router


// ============================================================
// src/modules/importaciones/importaciones.controller.js
// ============================================================
import * as service from './importaciones.service.js'
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

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}


// ============================================================
// src/modules/importaciones/importaciones.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.importacion.findMany({
    where: {
      empresa_id,
      ...(filters.estado && { estado: filters.estado }),
    },
    include: {
      pedidos: {
        select: { pedido_id: true, codigo: true, estado: true, proveedor: { select: { nombre: true } } }
      },
      _count: { select: { pedidos: true, costeos: true } }
    },
    orderBy: { creado_en: 'desc' },
  })
}

export const getById = async (empresa_id, importacion_id) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id },
    include: {
      pedidos: { include: { proveedor: true, lineas: { include: { producto: true } } } },
      costeos: true,
      contenedores: true,
      tramite_aduana: true,
      historial_union: { include: { usuario: { select: { nombre: true } }, pedido: { select: { codigo: true } } } },
    },
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  return importacion
}

export const update = async (empresa_id, importacion_id, data) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  if (importacion.estado === 'cerrada') throw new AppError('No se puede editar una importación cerrada', 400, 'IMPORTACION_CERRADA')

  return await prisma.importacion.update({ where: { importacion_id }, data })
}


// ============================================================
// src/modules/importaciones/importaciones.schema.js
// ============================================================
import { z } from 'zod'

export const updateImportacionSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    descripcion: z.string().max(200).optional(),
    estado:      z.enum(['borrador', 'en_proceso', 'en_transito', 'en_aduana', 'en_bodega', 'cerrada']).optional(),
  })
})
