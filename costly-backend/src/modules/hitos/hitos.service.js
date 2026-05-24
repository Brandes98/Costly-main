// ============================================================
// src/modules/hitos/hitos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { calcularSemaforo } from '../../utils/fecha.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  const hitos = await prisma.hito.findMany({
    where: {
      pedido: { empresa_id },
      ...(filters.pedido_id && { pedido_id: parseInt(filters.pedido_id) }),
      ...(filters.estado && { estado: filters.estado }),
    },
    include: {
      pedido: { select: { codigo: true } },
      responsable: { select: { nombre: true } },
    },
    orderBy: { fecha_plan: 'asc' },
  })

  // Agregar semáforo calculado a cada hito
  return hitos.map(h => ({
    ...h,
    semaforo: h.estado === 'completado' ? 'verde' : calcularSemaforo(h.fecha_plan)
  }))
}

export const create = async (empresa_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  return await prisma.hito.create({ data })
}

export const update = async (empresa_id, hito_id, data) => {
  const hito = await prisma.hito.findFirst({
    where: { hito_id, pedido: { empresa_id } }
  })
  if (!hito) throw new AppError('Hito no encontrado', 404, 'HITO_NOT_FOUND')

  const updateData = { ...data }

  // Convertir fechas string a Date para Prisma
  if (updateData.fecha_plan) updateData.fecha_plan = new Date(updateData.fecha_plan)
  if (updateData.fecha_real) updateData.fecha_real = new Date(updateData.fecha_real)

  // Si se marca como completado sin fecha real, usar ahora
  if (data.estado === 'completado' && !data.fecha_real) {
    updateData.fecha_real = new Date()
  }

  return await prisma.hito.update({ where: { hito_id }, data: updateData })
}