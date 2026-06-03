// ============================================================
// src/modules/pedidos/pedidos.controller.js
// ============================================================
import * as service from './pedidos.service.js'
import * as proyeccionService from './proyeccion.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'
import { registrarAuditoria } from '../../middlewares/audit.middleware.js'

export const getAll = async (req, res) => {
  try {
    return successResponse(res, await service.getAll(req.user.empresa_id, req.query))
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    const result = await service.create(req.user.empresa_id, req.user.usuario_id, req.body)
    await registrarAuditoria({
      empresa_id:    req.user.empresa_id,
      usuario_id:    req.user.usuario_id,
      accion:        'INSERT',
      entidad_tipo:  'pedido',
      entidad_id:    result.pedido_id,
      valor_despues: result,
      ip:            req.ip,
    })
    return successResponse(res, result, 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(
      req.user.empresa_id,
      parseInt(req.params.id),
      req.body,
      req.user.usuario_id,  // ← agregar
      req.ip,               // ← agregar
    ))
  } catch (error) { return errorResponse(res, error) }
}
export const updateEstado = async (req, res) => {
  try {
    return successResponse(res, await service.updateEstado(req.user.empresa_id, parseInt(req.params.id), req.body.estado, req.user.usuario_id))
  } catch (error) { return errorResponse(res, error) }
}

export const unirPedidos = async (req, res) => {
  try {
    return successResponse(res, await service.unirPedidos(req.user.empresa_id, req.user.usuario_id, req.body.pedido_ids, req.body.nota), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const separarPedido = async (req, res) => {
  try {
    return successResponse(res, await service.separarPedido(req.user.empresa_id, req.user.usuario_id, parseInt(req.params.id), req.body.linea_ids, req.body.nota), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const cancel = async (req, res) => {
  try {
    await service.cancel(req.user.empresa_id, req.user.usuario_id, parseInt(req.params.id), req.body.motivo)
    return successResponse(res, { message: 'Pedido cancelado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}

// ── Proyección
export const getProyeccion = async (req, res) => {
  try {
    return successResponse(res, await proyeccionService.get(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const calcularProyeccion = async (req, res) => {
  try {
    return successResponse(res, await proyeccionService.calcular(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}

export const detalleProyeccion = async (req, res) => {
  try {
    return successResponse(res, await proyeccionService.detalle(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const addLinea = async (req, res) => {
  try {
    return successResponse(res, await service.addLinea(req.user.empresa_id, parseInt(req.params.id), req.body), 201)
  } catch (error) { return errorResponse(res, error) }
}
 
export const updateLinea = async (req, res) => {
  try {
    return successResponse(res, await service.updateLinea(req.user.empresa_id, parseInt(req.params.id), parseInt(req.params.linea_id), req.body))
  } catch (error) { return errorResponse(res, error) }
}
 
export const deleteLinea = async (req, res) => {
  try {
    const result = await service.deleteLinea(req.user.empresa_id, parseInt(req.params.id), parseInt(req.params.linea_id))
    await registrarAuditoria({
      empresa_id:   req.user.empresa_id,
      usuario_id:   req.user.usuario_id,
      accion:       'DELETE',
      entidad_tipo: 'linea_pedido',
      entidad_id:   parseInt(req.params.linea_id),
      ip:           req.ip,
    })
    return successResponse(res, result)
  } catch (error) { return errorResponse(res, error) }
}
 