// ============================================================
// src/modules/costeos/costeos.routes.js
// ============================================================
import { Router }    from 'express'
import multer        from 'multer'
import path          from 'path'
import fs            from 'fs'

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'costeos')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `costeo-\${Date.now()}-\${Math.round(Math.random()*1e6)}\${path.extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './costeos.controller.js'
import { createCosteoSchema, updateCosteoSchema, createAproximacionSchema } from './costeos.schema.js'

const router = Router()
router.use(authenticate)

const AUTH = authorize('finanzas', 'operador_sr', 'admin')

// ── Aproximación de costeo
router.post('/aproximacion', AUTH, validate(createAproximacionSchema), auditLog('costeo', 'INSERT'), controller.createAproximacion)

router.get('/',    AUTH, controller.getAll)
router.get('/:id', AUTH, controller.getById)
router.post('/',   AUTH, validate(createCosteoSchema), auditLog('costeo', 'INSERT'), controller.create)
router.patch('/:id', AUTH, validate(updateCosteoSchema), auditLog('costeo', 'UPDATE'), controller.update)
router.delete('/:id', AUTH, auditLog('costeo', 'DELETE'), controller.remove)
router.post('/:id/aprobar', authorize('admin'), auditLog('costeo', 'UPDATE'), controller.aprobar)


// ── Notas y archivos por campo
router.get('/:id/detalles',             AUTH, controller.getDetalles)
router.post('/:id/detalles',            AUTH, controller.saveDetalles)
router.post('/:id/archivos',            AUTH, upload.single('archivo'), controller.saveArchivo)
router.delete('/:id/archivos/:doc_id',  AUTH, controller.deleteArchivo)

// ── Gestión de importaciones del costeo
router.post('/:id/importaciones',                    AUTH, controller.addImportacion)
router.delete('/:id/importaciones/:importacion_id',  AUTH, controller.removeImportacion)

export default router
