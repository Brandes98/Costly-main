
// ============================================================
// src/modules/usuarios/usuarios.service.js
// ============================================================
import bcrypt from 'bcryptjs'
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

const SAFE_SELECT = {
  usuario_id: true, empresa_id: true, nombre: true,
  email: true, rol: true, activo: true, ultimo_acceso: true, creado_en: true,
}

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.usuario.findMany({
    where: {
      empresa_id,
      ...(filters.activo !== undefined && { activo: filters.activo === 'true' }),
      ...(filters.rol && { rol: filters.rol }),
    },
    select: SAFE_SELECT,
    orderBy: { nombre: 'asc' },
  })
}

export const getById = async (empresa_id, usuario_id) => {
  const usuario = await prisma.usuario.findFirst({
    where: { usuario_id, empresa_id },
    select: SAFE_SELECT,
  })
  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND')
  return usuario
}

export const create = async (empresa_id, data) => {
  const existe = await prisma.usuario.findUnique({ where: { email: data.email } })
  if (existe) throw new AppError('Ya existe un usuario con ese email', 409, 'EMAIL_DUPLICATE')

  const password_hash = await bcrypt.hash(data.password_temporal || 'Cambiar1234!', 12)

  return await prisma.usuario.create({
    data: {
      empresa_id,
      nombre: data.nombre,
      email: data.email,
      password_hash,
      rol: data.rol,
      activo: true,
    },
    select: SAFE_SELECT,
  })
}

export const update = async (empresa_id, usuario_id, data) => {
  const usuario = await prisma.usuario.findFirst({ where: { usuario_id, empresa_id } })
  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND')

  return await prisma.usuario.update({
    where: { usuario_id },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.rol && { rol: data.rol }),
    },
    select: SAFE_SELECT,
  })
}

export const deactivate = async (empresa_id, usuario_id, solicitante_id) => {
  if (usuario_id === solicitante_id) {
    throw new AppError('No podés desactivar tu propio usuario', 400, 'SELF_DEACTIVATE')
  }

  // Verificar que no sea el último admin
  const usuario = await prisma.usuario.findFirst({ where: { usuario_id, empresa_id } })
  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND')

  if (usuario.rol === 'admin') {
    const adminsActivos = await prisma.usuario.count({
      where: { empresa_id, rol: 'admin', activo: true }
    })
    if (adminsActivos <= 1) {
      throw new AppError('No se puede desactivar al único admin de la empresa', 400, 'LAST_ADMIN')
    }
  }

  await prisma.usuario.update({ where: { usuario_id }, data: { activo: false } })
}

export const cambiarPassword = async (empresa_id, usuario_id, nueva_password) => {
  const usuario = await prisma.usuario.findFirst({ where: { usuario_id, empresa_id } })
  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND')
  const password_hash = await bcrypt.hash(nueva_password, 12)
  await prisma.usuario.update({ where: { usuario_id }, data: { password_hash } })
}