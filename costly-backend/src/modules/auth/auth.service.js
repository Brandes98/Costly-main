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