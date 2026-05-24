// ============================================================
// src/modules/importaciones/importaciones.controller.js
// ============================================================
import * as service from './importaciones.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

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

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}

export const remove = async (req, res) => {
  try {
    return successResponse(res, await service.remove(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const addPedido = async (req, res) => {
  try {
    return successResponse(res, await service.addPedido(
      req.user.empresa_id,
      parseInt(req.params.id),
      parseInt(req.body.pedido_id),
      req.user.usuario_id,
    ))
  } catch (error) { return errorResponse(res, error) }
}
 
export const addContenedor = async (req, res) => {
  try {
    return successResponse(res, await service.addContenedor(
      req.user.empresa_id, parseInt(req.params.id), req.body
    ), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const updateContenedor = async (req, res) => {
  try {
    return successResponse(res, await service.updateContenedor(
      req.user.empresa_id, parseInt(req.params.id), parseInt(req.params.cont_id), req.body
    ))
  } catch (error) { return errorResponse(res, error) }
}

export const removeContenedor = async (req, res) => {
  try {
    await service.removeContenedor(
      req.user.empresa_id, parseInt(req.params.id), parseInt(req.params.cont_id)
    )
    return successResponse(res, { ok: true })
  } catch (error) { return errorResponse(res, error) }
}

export const removePedido = async (req, res) => {
  try {
    return successResponse(res, await service.removePedido(
      req.user.empresa_id,
      parseInt(req.params.id),
      parseInt(req.params.pedido_id),
      req.user.usuario_id,
    ))
  } catch (error) { return errorResponse(res, error) }
}