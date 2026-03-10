// ============================================================
// src/modules/tramite-aduana/tramite.all.js
// ============================================================

// ── tramite.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './tramite.controller.js'
import { upsertTramiteSchema } from './tramite.schema.js'

const router = Router()
router.use(authenticate)

router.get('/:importacion_id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getByImportacion)
router.put('/:importacion_id',   authorize('operador', 'operador_sr', 'admin'), validate(upsertTramiteSchema), auditLog('tramite_aduana', 'UPDATE'), controller.upsert)

export default router

// ── tramite.controller.js
import * as service from './tramite.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getByImportacion = async (req, res) => {
  try { return successResponse(res, await service.getByImportacion(req.user.empresa_id, parseInt(req.params.importacion_id))) }
  catch (error) { return errorResponse(res, error) }
}
export const upsert = async (req, res) => {
  try { return successResponse(res, await service.upsert(req.user.empresa_id, parseInt(req.params.importacion_id), req.body)) }
  catch (error) { return errorResponse(res, error) }
}

// ── tramite.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getByImportacion = async (empresa_id, importacion_id) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')

  return await prisma.tramite_aduana.findUnique({ where: { importacion_id } })
}

export const upsert = async (empresa_id, importacion_id, data) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')

  return await prisma.tramite_aduana.upsert({
    where:  { importacion_id },
    update: data,
    create: { importacion_id, ...data },
  })
}

// ── tramite.schema.js
import { z } from 'zod'

export const upsertTramiteSchema = z.object({
  params: z.object({ importacion_id: z.string().regex(/^\d+$/) }),
  body: z.object({
    agente_id:     z.number().int().positive().optional(),
    dua_numero:    z.string().max(40).optional(),
    tc_hacienda:   z.number().positive().optional(),
    fecha_dua:     z.string().datetime().optional(),
    almacen_fiscal:z.string().max(120).optional(),
    valor_cif_cr:  z.number().positive().optional(),
    total_tributos:z.number().positive().optional(),
    estado:        z.enum(['pendiente', 'en_proceso', 'aprobado', 'objetado']).optional(),
  })
})


// ============================================================
// src/modules/permisos/permisos.all.js
// ============================================================

// ── permisos.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './permisos.controller.js'
import { createPermisoSchema, updatePermisoSchema } from './permisos.schema.js'

const router2 = Router()
router2.use(authenticate)

router2.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router2.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createPermisoSchema), auditLog('permiso', 'INSERT'), controller.create)
router2.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updatePermisoSchema), auditLog('permiso', 'UPDATE'), controller.update)

export { router2 as permisosRouter }

// ── permisos.controller.js
import * as permService from './permisos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await permService.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await permService.create(req.user.empresa_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const update = async (req, res) => {
  try { return successResponse(res, await permService.update(req.user.empresa_id, parseInt(req.params.id), req.body)) }
  catch (error) { return errorResponse(res, error) }
}

// ── permisos.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.permiso.findMany({
    where: {
      pedido: { empresa_id },
      ...(filters.estado    && { estado: filters.estado }),
      ...(filters.pedido_id && { pedido_id: parseInt(filters.pedido_id) }),
    },
    include: {
      pedido:   { select: { codigo: true } },
      producto: { select: { nombre: true, sku: true } },
    },
    orderBy: { fecha_solicitud: 'desc' },
  })
}

export const create = async (empresa_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  return await prisma.permiso.create({ data })
}

export const update = async (empresa_id, permiso_id, data) => {
  const permiso = await prisma.permiso.findFirst({ where: { permiso_id, pedido: { empresa_id } } })
  if (!permiso) throw new AppError('Permiso no encontrado', 404, 'PERMISO_NOT_FOUND')
  return await prisma.permiso.update({ where: { permiso_id }, data })
}

// ── permisos.schema.js
import { z } from 'zod'

export const createPermisoSchema = z.object({
  body: z.object({
    pedido_id:        z.number().int().positive(),
    producto_id:      z.number().int().positive().optional(),
    tipo:             z.enum(['minae', 'senasa', 'minsa', 'sutel', 'otro']),
    numero:           z.string().max(60).optional(),
    fecha_solicitud:  z.string().datetime().optional(),
    url_documento:    z.string().url().optional(),
    nota:             z.string().optional(),
  })
})

export const updatePermisoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    estado:              z.enum(['pendiente', 'en_tramite', 'aprobado', 'rechazado', 'vencido']).optional(),
    numero:              z.string().max(60).optional(),
    fecha_aprobacion:    z.string().datetime().optional(),
    fecha_vencimiento:   z.string().datetime().optional(),
    url_documento:       z.string().url().optional(),
    nota:                z.string().optional(),
  })
})


// ============================================================
// src/modules/auditoria/auditoria.all.js
// ============================================================

// ── auditoria.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import * as audController from './auditoria.controller.js'

const router3 = Router()
router3.use(authenticate)

router3.get('/', authorize('admin'), audController.getAll)

export { router3 as auditoriaRouter }

// ── auditoria.controller.js
import * as audService from './auditoria.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await audService.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}

// ── auditoria.service.js
import prisma from '../../config/database.js'
import { parsePagination, buildMeta } from '../../utils/pagination.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  const { page, limit, skip } = parsePagination(filters)

  const where = {
    empresa_id,
    ...(filters.entidad_tipo && { entidad_tipo: filters.entidad_tipo }),
    ...(filters.usuario_id   && { usuario_id: parseInt(filters.usuario_id) }),
    ...(filters.accion       && { accion: filters.accion }),
    ...(filters.desde        && { creado_en: { gte: new Date(filters.desde) } }),
    ...(filters.hasta        && { creado_en: { lte: new Date(filters.hasta) } }),
  }

  const [total, registros] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { creado_en: 'desc' },
      skip,
      take: limit,
    })
  ])

  return { registros, meta: buildMeta(total, page, limit) }
}
