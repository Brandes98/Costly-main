// ============================================================
// src/modules/reportes/reportes.controller.js
// ============================================================
import * as service from './reportes.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

// ── Reportes guardados
export const getAll = async (req, res) => {
  try { return successResponse(res, await service.getAll(req.user.empresa_id, req.user.usuario_id, req.query)) }
  catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try { return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id))) }
  catch (error) { return errorResponse(res, error) }
}

export const generar = async (req, res) => {
  console.log('Body recibido:', req.body);
  console.log('Headers:', req.headers);
  try { return successResponse(res, await service.generar(req.user.empresa_id, req.body)) }
  catch (error) { return errorResponse(res, error) }
}

export const save = async (req, res) => {
  try { return successResponse(res, await service.save(req.user.empresa_id, req.user.usuario_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}

export const remove = async (req, res) => {
  try {
    await service.remove(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Reporte eliminado' })
  } catch (error) { return errorResponse(res, error) }
}
