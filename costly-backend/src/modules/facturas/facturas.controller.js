// ============================================================
// src/modules/facturas/facturas.controller.js
// ============================================================
import * as service from './facturas.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getByPedido = async (req, res) => {
  try {
    return successResponse(res, await service.getByPedido(req.user.empresa_id, parseInt(req.params.pedido_id)))
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    const data = {
      pedido_id:    parseInt(req.body.pedido_id),
      proveedor_id: req.body.proveedor_id ? parseInt(req.body.proveedor_id) : undefined,
      numero:  req.body.numero,
      fecha:   req.body.fecha,
      monto:   req.body.monto,
      moneda:  req.body.moneda,
      tipo:    req.body.tipo,
      nota:    req.body.nota,
    }
    return successResponse(res, await service.create(req.user.empresa_id, req.user.usuario_id, data, req.file), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body, req.file))
  } catch (error) { return errorResponse(res, error) }
}

export const remove = async (req, res) => {
  try {
    await service.remove(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Factura eliminada' })
  } catch (error) { return errorResponse(res, error) }
}
