import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.proveedor.findMany({
    where: {
      empresa_id,
      activo: true,
      ...(filters.pais_id && { pais_id: parseInt(filters.pais_id) }),
    },
    include: { pais: { select: { codigo: true, nombre: true, bandera: true } } },
    orderBy: { nombre: 'asc' },
  })
}

export const getById = async (empresa_id, proveedor_id) => {
  const proveedor = await prisma.proveedor.findFirst({
    where: { proveedor_id, empresa_id },
    include: { pais: true },
  })
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')
  return proveedor
}

export const create = async (empresa_id, data) => {
  const pais = await prisma.pais.findUnique({ where: { pais_id: data.pais_id } })
  if (!pais) throw new AppError('País no encontrado', 404, 'PAIS_NOT_FOUND')

  return await prisma.proveedor.create({
    data: { empresa_id, ...data },
    include: { pais: { select: { codigo: true, nombre: true, bandera: true } } },
  })
}

export const update = async (empresa_id, proveedor_id, data) => {
  const proveedor = await prisma.proveedor.findFirst({ where: { proveedor_id, empresa_id } })
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')

  return await prisma.proveedor.update({
    where: { proveedor_id },
    data,
    include: { pais: { select: { codigo: true, nombre: true, bandera: true } } },
  })
}

export const deactivate = async (empresa_id, proveedor_id) => {
  const proveedor = await prisma.proveedor.findFirst({ where: { proveedor_id, empresa_id } })
  if (!proveedor) throw new AppError('Proveedor no encontrado', 404, 'PROVEEDOR_NOT_FOUND')

  const pedidosActivos = await prisma.pedido.count({
    where: { proveedor_id, estado: { notIn: ['cerrado', 'cancelado'] } }
  })
  if (pedidosActivos > 0) {
    throw new AppError('No se puede desactivar un proveedor con pedidos activos', 400, 'PROVEEDOR_CON_PEDIDOS')
  }

  await prisma.proveedor.update({ where: { proveedor_id }, data: { activo: false } })
}
