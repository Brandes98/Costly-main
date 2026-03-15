// ============================================================
// src/modules/documentos/documentos.all.js
// ============================================================

// ── documentos.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './documentos.controller.js'
import { createDocumentoSchema } from './documentos.schema.js'

const router = Router()
router.use(authenticate)

router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createDocumentoSchema), auditLog('documento', 'INSERT'), controller.create)
router.delete('/:id', authorize('admin'), auditLog('documento', 'DELETE'), controller.remove)

export default router

// ── documentos.controller.js
import * as service from './documentos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await service.create(req.user.empresa_id, req.user.usuario_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const remove = async (req, res) => {
  try {
    await service.remove(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Documento eliminado' })
  } catch (error) { return errorResponse(res, error) }
}

// ── documentos.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.documento.findMany({
    where: {
      empresa_id,
      ...(filters.entidad_tipo && { entidad_tipo: filters.entidad_tipo }),
      ...(filters.entidad_id && { entidad_id: parseInt(filters.entidad_id) }),
      ...(filters.tipo_doc && { tipo_doc: filters.tipo_doc }),
    },
    include: { subidor: { select: { nombre: true } } },
    orderBy: { subido_en: 'desc' },
  })
}

export const create = async (empresa_id, usuario_id, data) => {
  return await prisma.documento.create({
    data: { empresa_id, subido_por: usuario_id, ...data }
  })
}

export const remove = async (empresa_id, doc_id) => {
  const doc = await prisma.documento.findFirst({ where: { doc_id, empresa_id } })
  if (!doc) throw new AppError('Documento no encontrado', 404, 'DOC_NOT_FOUND')
  await prisma.documento.delete({ where: { doc_id } })
}

// ── documentos.schema.js
import { z } from 'zod'

export const createDocumentoSchema = z.object({
  body: z.object({
    entidad_tipo: z.string().max(40),
    entidad_id: z.number().int().positive(),
    tipo_doc: z.enum(['factura', 'bl', 'dua', 'permiso', 'seguro', 'packing', 'otro']),
    nombre: z.string().min(1).max(200),
    url: z.string().url().max(500),
    tamanio_kb: z.number().int().positive().optional(),
    mime_type: z.string().max(80).optional(),
  })
})
