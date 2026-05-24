// ============================================================
// src/modules/importaciones/importaciones.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './importaciones.controller.js'
import * as contenedoresController from '../contenedores/contenedores.controller.js'
import { updateImportacionSchema } from './importaciones.schema.js'

const router = Router()
router.use(authenticate)

// GET /api/v1/importaciones
router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)

// GET /api/v1/importaciones/:id
router.get('/:id', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)

// PATCH /api/v1/importaciones/:id
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateImportacionSchema), auditLog('importacion', 'UPDATE'), controller.update)

router.delete('/:id', authorize('operador_sr','admin'), auditLog('importacion','DELETE'), controller.remove)

router.post('/:id/pedidos',          authorize('operador_sr','admin'), auditLog('importacion','UPDATE'), controller.addPedido)

router.delete('/:id/pedidos/:pedido_id', authorize('operador_sr','admin'), auditLog('importacion','UPDATE'), controller.removePedido)

// ── Contenedores anidados bajo importación
router.post('/:id/contenedores',              authorize('operador','operador_sr','admin'), auditLog('contenedor','INSERT'), controller.addContenedor)
router.patch('/:id/contenedores/:cont_id',    authorize('operador','operador_sr','admin'), auditLog('contenedor','UPDATE'), controller.updateContenedor)
router.delete('/:id/contenedores/:cont_id',   authorize('operador_sr','admin'),            auditLog('contenedor','DELETE'), controller.removeContenedor)

export default router