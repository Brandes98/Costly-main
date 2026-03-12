
// ============================================================
// src/modules/auditoria/auditoria.controller.js
// ============================================================
import * as service from './auditoria.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    return successResponse(res, await service.getAll(req.user.empresa_id, req.query))
  } catch (error) { return errorResponse(res, error) }
}
