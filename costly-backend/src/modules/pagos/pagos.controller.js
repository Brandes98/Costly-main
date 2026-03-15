// ── pagos.controller.js
import * as service from './pagos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const getById = async (req, res) => {
  try { return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id))) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await service.create(req.user.empresa_id, req.user.usuario_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const confirmar = async (req, res) => {
  try { return successResponse(res, await service.confirmar(req.user.empresa_id, parseInt(req.params.id))) }
  catch (error) { return errorResponse(res, error) }
}