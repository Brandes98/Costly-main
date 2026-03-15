// ============================================================
// src/modules/empresa/empresa.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './empresa.controller.js'
import { updateEmpresaSchema } from './empresa.schema.js'

const router = Router()
router.use(authenticate)

router.get('/', authorize('admin'), controller.get)
router.patch('/', authorize('admin'), validate(updateEmpresaSchema), auditLog('empresa', 'UPDATE'), controller.update)

export default router


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


// ============================================================
// src/modules/empresa/empresa.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const get = async (empresa_id) => {
  const empresa = await prisma.empresa.findUnique({ where: { empresa_id } })
  if (!empresa) throw new AppError('Empresa no encontrada', 404, 'EMPRESA_NOT_FOUND')
  return empresa
}

export const update = async (empresa_id, data) => {
  const empresa = await prisma.empresa.findUnique({ where: { empresa_id } })
  if (!empresa) throw new AppError('Empresa no encontrada', 404, 'EMPRESA_NOT_FOUND')

  return await prisma.empresa.update({
    where: { empresa_id },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.cedula_juridica && { cedula_juridica: data.cedula_juridica }),
      ...(data.telefono && { telefono: data.telefono }),
      ...(data.email && { email: data.email }),
      ...(data.direccion && { direccion: data.direccion }),
      ...(data.moneda_base && { moneda_base: data.moneda_base }),
      ...(data.logo_url && { logo_url: data.logo_url }),
    }
  })
}


// ============================================================
// src/modules/empresa/empresa.schema.js
// ============================================================
import { z } from 'zod'

export const updateEmpresaSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).max(150).optional(),
    cedula_juridica: z.string().max(20).optional(),
    telefono: z.string().max(20).optional(),
    email: z.string().email().optional(),
    direccion: z.string().max(300).optional(),
    moneda_base: z.string().length(3).optional(),
    logo_url: z.string().url().optional(),
  })
})
