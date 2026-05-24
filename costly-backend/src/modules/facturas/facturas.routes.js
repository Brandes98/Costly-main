// ============================================================
// src/modules/facturas/facturas.routes.js
// ============================================================
import { Router }       from 'express'
import multer           from 'multer'
import path             from 'path'
import fs               from 'fs'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize }    from '../../middlewares/roles.middleware.js'
import { auditLog }     from '../../middlewares/audit.middleware.js'
import * as controller  from './facturas.controller.js'

// ── Configuración multer
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'facturas')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname)
    cb(null, `factura-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.jpg','.jpeg','.png','.xlsx','.xls']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new Error('Tipo de archivo no permitido'))
  }
})

const router = Router()
router.use(authenticate)
const AUTH = authorize('operador','operador_sr','finanzas','admin')

router.get('/pedido/:pedido_id', authorize('consultas','operador','operador_sr','finanzas','admin'), controller.getByPedido)
router.post('/',    AUTH, upload.single('archivo'), auditLog('factura_prov','INSERT'), controller.create)
router.patch('/:id', AUTH, upload.single('archivo'), auditLog('factura_prov','UPDATE'), controller.update)
router.delete('/:id', authorize('admin','operador_sr'), auditLog('factura_prov','DELETE'), controller.remove)

export default router
