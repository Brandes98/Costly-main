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

// GET /api/vi/documentos
router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)

// POST /api/vi/documentos
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createDocumentoSchema), auditLog('documento', 'INSERT'), controller.create)

// DELETE /api/vi/documentos/:id
router.delete('/:id', authorize('admin'), auditLog('documento', 'DELETE'), controller.remove)

export default router