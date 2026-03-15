// ── pagos.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './pagos.controller.js'
import { createPagoSchema } from './pagos.schema.js'

const router = Router()
router.use(authenticate)

// GET /api/v1/pagos
router.get('/', authorize('finanzas', 'operador_sr', 'admin'), controller.getAll)

// GET /api/v1/pagos/:id
router.get('/:id', authorize('finanzas', 'operador_sr', 'admin'), controller.getById)

// POST /api/v1/pagos
router.post('/', authorize('finanzas', 'operador_sr', 'admin'), validate(createPagoSchema), auditLog('pago', 'INSERT'), controller.create)

// PATCH /api/v1/pagos/:id/confirmar
router.patch('/:id/confirmar', authorize('finanzas', 'admin'), auditLog('pago', 'UPDATE'), controller.confirmar)

export default router