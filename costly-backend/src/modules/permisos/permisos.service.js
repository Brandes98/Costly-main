import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
 
export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.permiso.findMany({
    where: {
      pedido: { empresa_id },
      ...(filters.estado    && { estado: filters.estado }),
      ...(filters.pedido_id && { pedido_id: parseInt(filters.pedido_id) }),
      ...(filters.tipo      && { tipo: filters.tipo }),
    },
    include: {
      pedido:   { select: { codigo: true } },
      producto: { select: { nombre: true, sku: true } },
    },
    orderBy: { fecha_solicitud: 'desc' },
  })
}
 
export const getById = async (empresa_id, permiso_id) => {
  const permiso = await prisma.permiso.findFirst({
    where: { permiso_id, pedido: { empresa_id } },
    include: {
      pedido:   { select: { codigo: true } },
      producto: { select: { nombre: true, sku: true } },
    },
  })
  if (!permiso) throw new AppError('Permiso no encontrado', 404, 'PERMISO_NOT_FOUND')
  return permiso
}
 
export const create = async (empresa_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
 
  if (data.producto_id) {
    const producto = await prisma.producto.findFirst({ where: { producto_id: data.producto_id, empresa_id } })
    if (!producto) throw new AppError('Producto no encontrado', 404, 'PRODUCTO_NOT_FOUND')
  }
 
  return await prisma.permiso.create({ data })
}
 
export const update = async (empresa_id, permiso_id, data) => {
  const permiso = await prisma.permiso.findFirst({
    where: { permiso_id, pedido: { empresa_id } }
  })
  if (!permiso) throw new AppError('Permiso no encontrado', 404, 'PERMISO_NOT_FOUND')
 
  return await prisma.permiso.update({ where: { permiso_id }, data })
}