// ============================================================
// src/modules/auth/auth.routes.js
// ============================================================
import { Router } from 'express'
import { validate } from '../../middlewares/validate.middleware.js'
import { authRateLimit } from '../../middlewares/rateLimit.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as controller from './auth.controller.js'
import { loginSchema, changePasswordSchema } from './auth.schema.js'

const router = Router()

// POST /api/v1/auth/login
router.post('/login',
  authRateLimit,
  validate(loginSchema),
  controller.login
)

// POST /api/v1/auth/logout
router.post('/logout',
  authenticate,
  controller.logout
)

// GET /api/v1/auth/me
router.get('/me',
  authenticate,
  controller.me
)

// PATCH /api/v1/auth/change-password
router.patch('/change-password',
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword
)

export default router


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


// ============================================================
// src/modules/auth/auth.service.js
// ============================================================
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../config/database.js'
import { registrarAuditoria } from '../../middlewares/audit.middleware.js'
import { AppError } from '../../utils/response.utils.js'

export const login = async (email, password, ip) => {
  // Buscar usuario
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      usuario_id:    true,
      empresa_id:    true,
      nombre:        true,
      email:         true,
      password_hash: true,
      rol:           true,
      activo:        true,
    }
  })

  if (!usuario || !usuario.activo) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS')
  }

  // Verificar contraseña
  const passwordValido = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordValido) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS')
  }

  // Generar JWT
  const token = jwt.sign(
    {
      usuario_id: usuario.usuario_id,
      empresa_id: usuario.empresa_id,
      rol:        usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

  // Actualizar último acceso
  await prisma.usuario.update({
    where: { usuario_id: usuario.usuario_id },
    data: { ultimo_acceso: new Date() }
  })

  // Registrar en auditoría
  await registrarAuditoria({
    empresa_id:   usuario.empresa_id,
    usuario_id:   usuario.usuario_id,
    accion:       'LOGIN',
    entidad_tipo: 'usuario',
    entidad_id:   usuario.usuario_id,
    ip,
  })

  return {
    token,
    usuario: {
      usuario_id: usuario.usuario_id,
      nombre:     usuario.nombre,
      email:      usuario.email,
      rol:        usuario.rol,
      empresa_id: usuario.empresa_id,
    }
  }
}

export const logout = async (usuario_id) => {
  // En esta implementación el logout es stateless (JWT)
  // Si se quiere invalidar tokens, se puede guardar en Redis una blacklist
  return true
}

export const getMe = async (usuario_id) => {
  const usuario = await prisma.usuario.findUnique({
    where: { usuario_id },
    select: {
      usuario_id:   true,
      nombre:       true,
      email:        true,
      rol:          true,
      activo:       true,
      ultimo_acceso: true,
      empresa: {
        select: {
          empresa_id:    true,
          nombre:        true,
          moneda_base:   true,
        }
      }
    }
  })

  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND')
  return usuario
}

export const changePassword = async (usuario_id, passwordActual, passwordNuevo) => {
  const usuario = await prisma.usuario.findUnique({
    where: { usuario_id },
    select: { password_hash: true }
  })

  const valido = await bcrypt.compare(passwordActual, usuario.password_hash)
  if (!valido) {
    throw new AppError('Contraseña actual incorrecta', 400, 'INVALID_PASSWORD')
  }

  const nuevoHash = await bcrypt.hash(passwordNuevo, 12)
  await prisma.usuario.update({
    where: { usuario_id },
    data: { password_hash: nuevoHash }
  })
}


// ============================================================
// src/modules/auth/auth.schema.js
// ============================================================
import { z } from 'zod'

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
})

export const changePasswordSchema = z.object({
  body: z.object({
    password_actual: z.string().min(6),
    password_nuevo:  z.string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
  })
})
