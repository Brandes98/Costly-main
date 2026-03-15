import * as service from './tc.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    const data = await service.getAll(req.user.empresa_id, req.query)
    return successResponse(res, data)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const getHoy = async (req, res) => {
  try {
    const data = await service.getHoy(req.user.empresa_id)
    return successResponse(res, data)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const create = async (req, res) => {
  try {
    const data = await service.create(req.user.empresa_id, req.body)
    return successResponse(res, data, 201)
  } catch (error) {
    return errorResponse(res, error)
  }
}

