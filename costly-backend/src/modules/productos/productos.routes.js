import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './productos.controller.js'
import { createProductoSchema, updateProductoSchema } from './productos.schema.js'

const router = Router()
router.use(authenticate)

router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createProductoSchema), auditLog('producto', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateProductoSchema), auditLog('producto', 'UPDATE'), controller.update)
router.delete('/:id', authorize('admin'), auditLog('producto', 'DELETE'), controller.deactivate)

export default router
