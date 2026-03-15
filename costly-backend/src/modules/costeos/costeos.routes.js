// ============================================================
// src/modules/costeos/costeos.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './costeos.controller.js'
import { createCosteoSchema, updateCosteoSchema } from './costeos.schema.js'

const router = Router()
router.use(authenticate)

// GET /api/v1/costeos
router.get('/', authorize('finanzas', 'operador_sr', 'admin'), controller.getAll)

// GET /api/v1/costeos/:id
router.get('/:id', authorize('finanzas', 'operador_sr', 'admin'), controller.getById)

// POST /api/v1/costeos
router.post('/', authorize('finanzas', 'operador_sr', 'admin'), validate(createCosteoSchema), auditLog('costeo', 'INSERT'), controller.create)

// PATCH /api/v1/costeos/:id
router.patch('/:id', authorize('finanzas', 'operador_sr', 'admin'), validate(updateCosteoSchema), auditLog('costeo', 'UPDATE'), controller.update)

// POST /api/v1/costeos/:id/aprobar
router.post('/:id/aprobar', authorize('admin'), auditLog('costeo', 'UPDATE'), controller.aprobar)

export default router