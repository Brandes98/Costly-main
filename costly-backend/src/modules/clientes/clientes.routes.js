import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './clientes.controller.js'
import { createClienteSchema, updateClienteSchema } from './clientes.schema.js'

const router = Router()
router.use(authenticate)

router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createClienteSchema), auditLog('cliente', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateClienteSchema), auditLog('cliente', 'UPDATE'), controller.update)
router.delete('/:id', authorize('admin'), auditLog('cliente', 'DELETE'), controller.deactivate)

export default router
