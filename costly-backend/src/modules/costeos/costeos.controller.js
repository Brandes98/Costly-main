// ============================================================
// src/modules/costeos/costeos.controller.js
// ============================================================
import * as service from './costeos.service.js'
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

export const update = async (req, res) => {
  try { return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body)) }
  catch (error) { return errorResponse(res, error) }
}

export const aprobar = async (req, res) => {
  try { return successResponse(res, await service.aprobar(req.user.empresa_id, parseInt(req.params.id), req.user.usuario_id)) }
  catch (error) { return errorResponse(res, error) }
}

export const remove = async (req, res) => {
  try {
    await service.remove(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { ok: true })
  } catch (error) { return errorResponse(res, error) }
}

export const addImportacion = async (req, res) => {
  try {
    return successResponse(res, await service.addImportacion(
      req.user.empresa_id, parseInt(req.params.id), req.body.importacion_id
    ), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const createAproximacion = async (req, res) => {
  try { return successResponse(res, await service.createAproximacion(req.user.empresa_id, req.user.usuario_id, req.body), 201) }
  catch (error) { return errorResponse(res, error) }
}

export const saveDetalles = async (req, res) => {
  try { return successResponse(res, await service.saveDetalles(req.user.empresa_id, parseInt(req.params.id), req.body.detalles)) }
  catch (error) { return errorResponse(res, error) }
}

export const saveArchivo = async (req, res) => {
  try {
    return successResponse(res, await service.saveArchivo(
      req.user.empresa_id, req.user.usuario_id,
      parseInt(req.params.id), req.body.campo, req.file
    ), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const getDetalles = async (req, res) => {
  try { return successResponse(res, await service.getDetalles(req.user.empresa_id, parseInt(req.params.id))) }
  catch (error) { return errorResponse(res, error) }
}

export const deleteArchivo = async (req, res) => {
  try {
    await service.deleteArchivo(req.user.empresa_id, parseInt(req.params.id), parseInt(req.params.doc_id))
    return successResponse(res, { ok: true })
  } catch (error) { return errorResponse(res, error) }
}

export const removeImportacion = async (req, res) => {
  try {
    return successResponse(res, await service.removeImportacion(
      req.user.empresa_id, parseInt(req.params.id), parseInt(req.params.importacion_id)
    ))
  } catch (error) { return errorResponse(res, error) }
}
