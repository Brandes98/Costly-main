// ============================================================
// src/modules/empresa/empresa.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './empresa.controller.js'
import { updateEmpresaSchema } from './empresa.schema.js'

const router = Router()
router.use(authenticate)

// GET /api/v1/empresa
router.get('/', authorize('admin'), controller.get)

// PATCH /api/v1/empresa
router.patch('/', authorize('admin'), validate(updateEmpresaSchema), auditLog('empresa', 'UPDATE'), controller.update)

export default router