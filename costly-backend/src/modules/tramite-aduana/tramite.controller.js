import * as service from './tramite.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getByImportacion = async (req, res) => {
  try {
    const data = await service.getByImportacion(
      req.user.empresa_id,
      parseInt(req.params.importacion_id)
    )
    return successResponse(res, data)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const upsert = async (req, res) => {
  try {
    const data = await service.upsert(
      req.user.empresa_id,
      parseInt(req.params.importacion_id),
      req.body
    )
    return successResponse(res, data)
  } catch (error) {
    return errorResponse(res, error)
  }
}
