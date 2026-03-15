import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './reportes.controller.js'
import { generarReporteSchema, saveReporteSchema } from './reportes.schema.js'
 
const router = Router()
router.use(authenticate)
 
router.get('/',               authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',            authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/generar',       authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), validate(generarReporteSchema), auditLog('reporte', 'EXPORT'), controller.generar)
router.post('/',              authorize('operador', 'operador_sr', 'finanzas', 'admin'), validate(saveReporteSchema), controller.save)
router.delete('/:id',         authorize('admin'), controller.remove)
 
export default router