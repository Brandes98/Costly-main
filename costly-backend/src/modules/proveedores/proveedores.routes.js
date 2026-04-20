import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './proveedores.controller.js'
import { createProveedorSchema, updateProveedorSchema } from './proveedores.schema.js'
import contactosRouter from './contactos.routes.js'
const router = Router()
router.use(authenticate)

router.get('/', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id', authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/', authorize('operador', 'operador_sr', 'admin'), validate(createProveedorSchema), auditLog('proveedor', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateProveedorSchema), auditLog('proveedor', 'UPDATE'), controller.update)
router.delete('/:id', authorize('admin'), auditLog('proveedor', 'DELETE'), controller.deactivate)
router.use('/:proveedor_id/contactos', contactosRouter)

export default router
