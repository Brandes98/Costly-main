// ============================================================
// src/modules/usuarios/usuarios.controller.js
// ============================================================
import * as service from './usuarios.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.getAll(empresa_id, req.query)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.getById(empresa_id, parseInt(req.params.id))
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.create(empresa_id, req.body)
    return successResponse(res, data, 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.update(empresa_id, parseInt(req.params.id), req.body)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const deactivate = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    await service.deactivate(empresa_id, parseInt(req.params.id), usuario_id)
    return successResponse(res, { message: 'Usuario desactivado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}

export const cambiarPassword = async (req, res) => {
  try {
    const { empresa_id } = req.user
    await service.cambiarPassword(empresa_id, parseInt(req.params.id), req.body.nueva_password)
    return successResponse(res, { message: 'Contraseña actualizada' })
  } catch (error) { return errorResponse(res, error) }
}