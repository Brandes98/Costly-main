import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import * as controller from './tc.controller.js'
import { createTCSchema } from './tc.schema.js'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'),
  controller.getAll
)

router.get(
  '/hoy',
  authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'),
  controller.getHoy
)

router.post(
  '/',
  authorize('finanzas', 'admin'),
  validate(createTCSchema),
  controller.create
)

export default router

