// ── contenedores.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.contenedor.findMany({
    where: {
      importacion: { empresa_id },
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.importacion_id && { importacion_id: parseInt(filters.importacion_id) }),
    },
    include: { importacion: { select: { codigo: true } } },
    orderBy: { contenedor_id: 'desc' },
  })
}

export const getById = async (empresa_id, contenedor_id) => {
  const contenedor = await prisma.contenedor.findFirst({
    where: { contenedor_id, importacion: { empresa_id } },
    include: { importacion: true },
  })
  if (!contenedor) throw new AppError('Contenedor no encontrado', 404, 'CONTENEDOR_NOT_FOUND')
  return contenedor
}

export const create = async (empresa_id, data) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id: data.importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  return await prisma.contenedor.create({ data })
}

export const update = async (empresa_id, contenedor_id, data) => {
  const contenedor = await prisma.contenedor.findFirst({ where: { contenedor_id, importacion: { empresa_id } } })
  if (!contenedor) throw new AppError('Contenedor no encontrado', 404, 'CONTENEDOR_NOT_FOUND')
  return await prisma.contenedor.update({ where: { contenedor_id }, data })
}
