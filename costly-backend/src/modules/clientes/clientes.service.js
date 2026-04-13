import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.cliente.findMany({
    where: {
      empresa_id,
      ...(filters.tipo && { tipo: filters.tipo }),
      ...(filters.activo !== undefined && { activo: filters.activo === 'true' }),
    },
    orderBy: { nombre: 'asc' },
  })
}

export const getById = async (empresa_id, cliente_id) => {
  const cliente = await prisma.cliente.findFirst({ where: { cliente_id, empresa_id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND')
  return cliente
}

export const create = async (empresa_id, data) => {
  if (data.cedula) {
    const existe = await prisma.cliente.findUnique({ where: { cedula: data.cedula } })
    if (existe) throw new AppError('Ya existe un cliente con esa cédula', 409, 'CEDULA_DUPLICATE')
  }
  return await prisma.cliente.create({ data: { empresa_id, ...data } })
}

export const update = async (empresa_id, cliente_id, data) => {
  const cliente = await prisma.cliente.findFirst({ where: { cliente_id, empresa_id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND')
  return await prisma.cliente.update({ where: { cliente_id }, data })
}

export const deactivate = async (empresa_id, cliente_id) => {
  const cliente = await prisma.cliente.findFirst({ where: { cliente_id, empresa_id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND')
  await prisma.cliente.update({ where: { cliente_id }, data: { activo: false } })
}
