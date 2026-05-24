// ============================================================
// src/modules/pedidos/pedidos.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './pedidos.controller.js'
import * as exportController from './export.controller.js'
import { createPedidoSchema, updatePedidoSchema, unirPedidosSchema, separarPedidoSchema } from './pedidos.schema.js'

const router = Router()
router.use(authenticate)

// ── CRUD base
router.get('/',    authorize('consultas','operador','operador_sr','finanzas','admin'), controller.getAll)
router.get('/:id', authorize('consultas','operador','operador_sr','finanzas','admin'), controller.getById)
router.post('/',   authorize('operador','operador_sr','admin'), validate(createPedidoSchema), auditLog('pedido','INSERT'), controller.create)
router.patch('/:id', authorize('operador','operador_sr','admin'), validate(updatePedidoSchema), auditLog('pedido','UPDATE'), controller.update)
router.delete('/:id', authorize('admin'), auditLog('pedido','DELETE'), controller.cancel)

// ── Cambio de estado
router.patch('/:id/estado', authorize('operador','operador_sr','admin'), auditLog('pedido','UPDATE'), controller.updateEstado)

// ── Unión y separación
router.post('/unir',       authorize('operador_sr','admin'), validate(unirPedidosSchema), auditLog('pedido','UPDATE'), controller.unirPedidos)
router.post('/:id/separar', authorize('operador_sr','admin'), validate(separarPedidoSchema), auditLog('pedido','UPDATE'), controller.separarPedido)

// ── Proyección de volumen
router.get('/:id/proyeccion',           authorize('consultas','operador','operador_sr','finanzas','admin'), controller.getProyeccion)
router.post('/:id/proyeccion/calcular', authorize('operador','operador_sr','admin'), controller.calcularProyeccion)
router.get('/:id/proyeccion/detalle',   authorize('consultas','operador','operador_sr','finanzas','admin'), controller.detalleProyeccion)

// ── Líneas
router.post('/:id/lineas',             authorize('operador','operador_sr','admin'), auditLog('linea_pedido','INSERT'), controller.addLinea)
router.patch('/:id/lineas/:linea_id',  authorize('operador','operador_sr','admin'), auditLog('linea_pedido','UPDATE'), controller.updateLinea)
router.delete('/:id/lineas/:linea_id', authorize('operador','operador_sr','admin'), auditLog('linea_pedido','DELETE'), controller.deleteLinea)

// ── Exportaciones
router.get('/:id/export/pdf',    authorize('consultas','operador','operador_sr','finanzas','admin'), exportController.exportPDF)
router.get('/:id/export/csv',    authorize('consultas','operador','operador_sr','finanzas','admin'), exportController.exportExcel)
router.get('/:id/export/costeo', authorize('consultas','operador','operador_sr','finanzas','admin'), exportController.exportCosteo)

export default router
