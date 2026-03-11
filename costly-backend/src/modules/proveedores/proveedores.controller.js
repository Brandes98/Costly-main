import * as service from './proveedores.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    const data = await service.getAll(req.user.empresa_id, req.query)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    const data = await service.getById(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    const data = await service.create(req.user.empresa_id, req.body)
    return successResponse(res, data, 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    const data = await service.update(req.user.empresa_id, parseInt(req.params.id), req.body)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const deactivate = async (req, res) => {
  try {
    await service.deactivate(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Proveedor desactivado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}
