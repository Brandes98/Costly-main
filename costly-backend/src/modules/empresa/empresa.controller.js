// ============================================================
// src/modules/empresa/empresa.controller.js
// ============================================================
import * as service from './empresa.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const get = async (req, res) => {
  try {
    return successResponse(res, await service.get(req.user.empresa_id))
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, req.body))
  } catch (error) { return errorResponse(res, error) }
}