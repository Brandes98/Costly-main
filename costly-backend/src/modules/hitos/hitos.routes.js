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

// GET /api/v1/hitos 
router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)

// POST /api/v1/hitos
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createHitoSchema), auditLog('hito', 'INSERT'), controller.create)

// PATCH /api/v1/hitos/:id
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateHitoSchema), auditLog('hito', 'UPDATE'), controller.update)

export default router

