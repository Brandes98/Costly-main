import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './tramite.controller.js'
import { upsertTramiteSchema } from './tramite.schema.js'

const router = Router()
router.use(authenticate)

router.get(
  '/:importacion_id',
  authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'),
  controller.getByImportacion
)

router.put(
  '/:importacion_id',
  authorize('operador', 'operador_sr', 'admin'),
  validate(upsertTramiteSchema),
  auditLog('tramite_aduana', 'UPDATE'),
  controller.upsert
)

export default router
