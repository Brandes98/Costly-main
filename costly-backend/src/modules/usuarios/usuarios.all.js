// ============================================================
// src/modules/usuarios/usuarios.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './usuarios.controller.js'
import { createUsuarioSchema, updateUsuarioSchema } from './usuarios.schema.js'

const router = Router()
router.use(authenticate)

router.get('/', authorize('admin'), controller.getAll)
router.get('/:id', authorize('admin'), controller.getById)
router.post('/', authorize('admin'), validate(createUsuarioSchema), auditLog('usuario', 'INSERT'), controller.create)
router.patch('/:id', authorize('admin'), validate(updateUsuarioSchema), auditLog('usuario', 'UPDATE'), controller.update)
router.delete('/:id', authorize('admin'), auditLog('usuario', 'DELETE'), controller.deactivate)

export default router


// ============================================================
// src/modules/usuarios/usuarios.controller.js
// ============================================================
import * as service from './usuarios.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.getAll(empresa_id, req.query)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.getById(empresa_id, parseInt(req.params.id))
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.create(empresa_id, req.body)
    return successResponse(res, data, 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const data = await service.update(empresa_id, parseInt(req.params.id), req.body)
    return successResponse(res, data)
  } catch (error) { return errorResponse(res, error) }
}

export const deactivate = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    await service.deactivate(empresa_id, parseInt(req.params.id), usuario_id)
    return successResponse(res, { message: 'Usuario desactivado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}


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


// ============================================================
// src/modules/usuarios/usuarios.schema.js
// ============================================================
import { z } from 'zod'

export const createUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).max(100),
    email: z.string().email(),
    rol: z.enum(['admin', 'operador_sr', 'operador', 'finanzas', 'consultas']),
    password_temporal: z.string().min(8).optional(),
  })
})

export const updateUsuarioSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    nombre: z.string().min(2).max(100).optional(),
    rol: z.enum(['admin', 'operador_sr', 'operador', 'finanzas', 'consultas']).optional(),
  })
})
