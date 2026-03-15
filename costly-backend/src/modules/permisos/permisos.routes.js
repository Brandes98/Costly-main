import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './permisos.controller.js'
import { createPermisoSchema, updatePermisoSchema } from './permisos.schema.js'
 
const router = Router()
router.use(authenticate)
 
router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createPermisoSchema), auditLog('permiso', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updatePermisoSchema), auditLog('permiso', 'UPDATE'), controller.update)
 
export default router