// ============================================================
// src/modules/import/import.routes.js
// ============================================================
import { Router } from 'express'
import multer     from 'multer'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize }    from '../../middlewares/roles.middleware.js'
import * as controller  from './import.controller.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()
router.use(authenticate)
const AUTH = authorize('operador_sr', 'admin')

// ── Plantillas
router.get('/plantilla/proveedores', AUTH, controller.plantillaProveedores)
router.get('/plantilla/clientes',    AUTH, controller.plantillaClientes)
router.get('/plantilla/productos',   AUTH, controller.plantillaProductos)

// ── Importar
router.post('/proveedores', AUTH, upload.single('archivo'), controller.importarProveedores)
router.post('/clientes',    AUTH, upload.single('archivo'), controller.importarClientes)
router.post('/productos',   AUTH, upload.single('archivo'), controller.importarProductos)

export default router
