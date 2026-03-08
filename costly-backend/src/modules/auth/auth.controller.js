// ============================================================
// src/modules/auth/auth.controller.js
// ============================================================
import * as service from './auth.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const ip = req.ip || req.headers['x-forwarded-for']
    const result = await service.login(email, password, ip)
    return successResponse(res, result)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const logout = async (req, res) => {
  try {
    await service.logout(req.user.usuario_id)
    return successResponse(res, { message: 'Sesión cerrada correctamente' })
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const me = async (req, res) => {
  try {
    const usuario = await service.getMe(req.user.usuario_id)
    return successResponse(res, usuario)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const changePassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body
    await service.changePassword(req.user.usuario_id, password_actual, password_nuevo)
    return successResponse(res, { message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    return errorResponse(res, error)
  }
}