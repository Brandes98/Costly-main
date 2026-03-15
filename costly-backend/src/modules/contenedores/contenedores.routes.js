// ── contenedores.routes.js
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './contenedores.controller.js'
import { createContenedorSchema, updateContenedorSchema } from './contenedores.schema.js'

const router = Router()
router.use(authenticate)

// GET /api/v1/contenedores
router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)

// GET /api/v1/contenedores/:id
router.get('/:id', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)

// POST /api/v1/contenedores
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createContenedorSchema), auditLog('contenedor', 'INSERT'), controller.create)

// PATCH /api/v1/contenedores/:id
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateContenedorSchema), auditLog('contenedor', 'UPDATE'), controller.update)

export default router