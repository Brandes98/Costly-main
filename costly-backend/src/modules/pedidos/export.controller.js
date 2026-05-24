// ============================================================
// src/modules/pedidos/export.controller.js
// ============================================================
import * as service from './export.service.js'
import { errorResponse } from '../../utils/response.utils.js'

export const exportPDF = async (req, res) => {
  try {
    const buffer = await service.exportPDF(req.user.empresa_id, parseInt(req.params.id))
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="pedido-${req.params.id}.pdf"`)
    res.send(Buffer.from(buffer))
  } catch (error) { return errorResponse(res, error) }
}

export const exportExcel = async (req, res) => {
  try {
    const buffer = await service.exportExcel(req.user.empresa_id, parseInt(req.params.id))
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="pedido-${req.params.id}.xlsx"`)
    res.send(buffer)
  } catch (error) { return errorResponse(res, error) }
}

export const exportCosteo = async (req, res) => {
  try {
    const buffer = await service.exportCosteo(req.user.empresa_id, parseInt(req.params.id))
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="costeo-${req.params.id}.xlsx"`)
    res.send(buffer)
  } catch (error) { return errorResponse(res, error) }
}
