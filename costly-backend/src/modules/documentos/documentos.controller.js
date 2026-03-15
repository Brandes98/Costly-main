// ── documentos.controller.js
import * as service from './documentos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}
export const create = async (req, res) => {
  try { return successResponse(res, await service.create(req.user.empresa_id, req.user.usuario_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}
export const remove = async (req, res) => {
  try {
    await service.remove(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Documento eliminado' })
  } catch (error) { return errorResponse(res, error) }
}
