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

// Validaciones de negocio de volumen
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
