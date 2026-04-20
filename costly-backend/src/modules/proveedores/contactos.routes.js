// ============================================================
// src/modules/proveedores/contactos.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as service from './contactos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

const router = Router({ mergeParams: true }) // mergeParams para acceder a :proveedor_id
router.use(authenticate)

// GET    /proveedores/:proveedor_id/contactos
router.get('/', authorize('consultas','operador','operador_sr','finanzas','admin'), async (req, res) => {
  try {
    return successResponse(res, await service.getContactos(req.user.empresa_id, req.params.proveedor_id))
  } catch (e) { return errorResponse(res, e) }
})

// POST   /proveedores/:proveedor_id/contactos
router.post('/', authorize('operador','operador_sr','admin'), auditLog('contacto_proveedor','INSERT'), async (req, res) => {
  try {
    return successResponse(res, await service.createContacto(req.user.empresa_id, req.params.proveedor_id, req.body), 201)
  } catch (e) { return errorResponse(res, e) }
})

// PATCH  /proveedores/:proveedor_id/contactos/:contacto_id
router.patch('/:contacto_id', authorize('operador','operador_sr','admin'), auditLog('contacto_proveedor','UPDATE'), async (req, res) => {
  try {
    return successResponse(res, await service.updateContacto(req.user.empresa_id, req.params.proveedor_id, req.params.contacto_id, req.body))
  } catch (e) { return errorResponse(res, e) }
})

// PATCH  /proveedores/:proveedor_id/contactos/:contacto_id/predeterminado
router.patch('/:contacto_id/predeterminado', authorize('operador','operador_sr','admin'), async (req, res) => {
  try {
    return successResponse(res, await service.setPredeterminado(req.user.empresa_id, req.params.proveedor_id, req.params.contacto_id))
  } catch (e) { return errorResponse(res, e) }
})

// DELETE /proveedores/:proveedor_id/contactos/:contacto_id
router.delete('/:contacto_id', authorize('operador_sr','admin'), auditLog('contacto_proveedor','DELETE'), async (req, res) => {
  try {
    return successResponse(res, await service.deleteContacto(req.user.empresa_id, req.params.proveedor_id, req.params.contacto_id))
  } catch (e) { return errorResponse(res, e) }
})

export default router
