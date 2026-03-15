// ── pagos.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.pago.findMany({
    where: {
      pedido: { empresa_id },
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.proveedor_id && { proveedor_id: parseInt(filters.proveedor_id) }),
    },
    include: {
      pedido: { select: { codigo: true } },
      proveedor: { select: { nombre: true } },
    },
    orderBy: { fecha_pago: 'desc' },
  })
}

export const getById = async (empresa_id, pago_id) => {
  const pago = await prisma.pago.findFirst({
    where: { pago_id, pedido: { empresa_id } },
    include: { pedido: true, proveedor: true },
  })
  if (!pago) throw new AppError('Pago no encontrado', 404, 'PAGO_NOT_FOUND')
  return pago
}

export const create = async (empresa_id, usuario_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  return await prisma.pago.create({
    data: { ...data, registrado_por: usuario_id, estado: 'programado' }
  })
}

export const confirmar = async (empresa_id, pago_id) => {
  const pago = await prisma.pago.findFirst({ where: { pago_id, pedido: { empresa_id } } })
  if (!pago) throw new AppError('Pago no encontrado', 404, 'PAGO_NOT_FOUND')
  return await prisma.pago.update({ where: { pago_id }, data: { estado: 'confirmado' } })
}