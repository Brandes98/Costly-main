// ============================================================
// src/modules/productos/productos.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './productos.controller.js'
import { createProductoSchema, updateProductoSchema } from './productos.schema.js'

const router = Router()
router.use(authenticate)

router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createProductoSchema), auditLog('producto', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updateProductoSchema), auditLog('producto', 'UPDATE'), controller.update)
router.delete('/:id',authorize('admin'), auditLog('producto', 'DELETE'), controller.deactivate)

export default router


// ============================================================
// src/modules/productos/productos.controller.js
// ============================================================
import * as service from './productos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    return successResponse(res, await service.getAll(req.user.empresa_id, req.query))
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    return successResponse(res, await service.create(req.user.empresa_id, req.body), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}

export const deactivate = async (req, res) => {
  try {
    await service.deactivate(req.user.empresa_id, parseInt(req.params.id))
    return successResponse(res, { message: 'Producto desactivado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}


// ============================================================
// src/modules/productos/productos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.producto.findMany({
    where: {
      empresa_id,
      activo: true,
      ...(filters.categoria && { categoria: filters.categoria }),
      ...(filters.requiere_permiso && { requiere_permiso: filters.requiere_permiso === 'true' }),
    },
    orderBy: { nombre: 'asc' },
  })
}

export const getById = async (empresa_id, producto_id) => {
  const producto = await prisma.producto.findFirst({ where: { producto_id, empresa_id } })
  if (!producto) throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND')
  return producto
}

export const create = async (empresa_id, data) => {
  // Validar modo_volumen vs campos requeridos
  validarCamposVolumen(data)

  return await prisma.producto.create({ data: { empresa_id, ...data } })
}

export const update = async (empresa_id, producto_id, data) => {
  const producto = await prisma.producto.findFirst({ where: { producto_id, empresa_id } })
  if (!producto) throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND')

  // Si cambia el modo_volumen validar campos
  if (data.modo_volumen) validarCamposVolumen({ ...producto, ...data })

  return await prisma.producto.update({ where: { producto_id }, data })
}

export const deactivate = async (empresa_id, producto_id) => {
  const producto = await prisma.producto.findFirst({ where: { producto_id, empresa_id } })
  if (!producto) throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND')
  await prisma.producto.update({ where: { producto_id }, data: { activo: false } })
}

// ── Validaciones de negocio de volumen
const validarCamposVolumen = (data) => {
  const modo = data.modo_volumen || 'unitario'

  if (modo === 'unitario' && !data.volumen_m3) {
    throw new AppError('El campo volumen_m3 es requerido para modo unitario', 400, 'VOLUMEN_REQUERIDO')
  }

  if (modo === 'por_caja' && (!data.unidades_por_caja || !data.volumen_caja_m3)) {
    throw new AppError('Los campos unidades_por_caja y volumen_caja_m3 son requeridos para modo por_caja', 400, 'CAJA_REQUERIDA')
  }

  if (data.tipo_estiba === 'otro' && !data.nota_estiba) {
    throw new AppError('El campo nota_estiba es obligatorio cuando tipo_estiba = otro', 400, 'NOTA_ESTIBA_REQUERIDA')
  }

  if (data.tipo_estiba === 'pallet_medida') {
    if (!data.pallet_largo_cm || !data.pallet_ancho_cm || !data.pallet_alto_max_cm || !data.pallet_peso_max_kg) {
      throw new AppError('Las dimensiones del pallet son obligatorias cuando tipo_estiba = pallet_medida', 400, 'DIMS_PALLET_REQUERIDAS')
    }
  }
}


// ============================================================
// src/modules/productos/productos.schema.js
// ============================================================
import { z } from 'zod'

const productoBase = z.object({
  sku:                z.string().min(1).max(50),
  nombre:             z.string().min(2).max(150),
  descripcion:        z.string().optional(),
  categoria:          z.string().max(80).optional(),
  cod_arancelario:    z.string().max(20).optional(),
  arancel_pct:        z.number().min(0).max(100).optional(),
  isc_pct:            z.number().min(0).max(100).optional(),
  peso_kg:            z.number().positive().optional(),
  largo_cm:           z.number().positive().optional(),
  ancho_cm:           z.number().positive().optional(),
  alto_cm:            z.number().positive().optional(),
  volumen_m3:         z.number().positive().optional(),
  modo_volumen:       z.enum(['unitario', 'por_caja', 'sin_volumen']).default('unitario'),
  unidades_por_caja:  z.number().int().positive().optional(),
  peso_caja_kg:       z.number().positive().optional(),
  volumen_caja_m3:    z.number().positive().optional(),
  tipo_estiba:        z.enum(['pallet_americano', 'pallet_europeo', 'pallet_medida', 'sin_pallet', 'otro']).optional(),
  pallet_largo_cm:    z.number().positive().optional(),
  pallet_ancho_cm:    z.number().positive().optional(),
  pallet_alto_max_cm: z.number().positive().optional(),
  pallet_peso_max_kg: z.number().positive().optional(),
  nota_estiba:        z.string().optional(),
  requiere_permiso:   z.boolean().optional(),
  permiso_tipo:       z.string().max(80).optional(),
})

export const createProductoSchema = z.object({ body: productoBase })
export const updateProductoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: productoBase.partial(),
})
