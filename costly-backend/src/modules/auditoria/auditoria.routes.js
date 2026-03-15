// ============================================================
// src/modules/auditoria/auditoria.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import * as controller from './auditoria.controller.js'

const router = Router()
router.use(authenticate)

// Solo lectura — nunca exponer POST, PATCH ni DELETE
router.get('/', authorize('admin'), controller.getAll)

export default router