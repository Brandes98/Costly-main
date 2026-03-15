// ============================================================
// src/modules/importaciones/importaciones.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.importacion.findMany({
    where: {
      empresa_id,
      ...(filters.estado && { estado: filters.estado }),
    },
    include: {
      pedidos: {
        select: { pedido_id: true, codigo: true, estado: true, proveedor: { select: { nombre: true } } }
      },
      _count: { select: { pedidos: true, costeos: true } }
    },
    orderBy: { creado_en: 'desc' },
  })
}

export const getById = async (empresa_id, importacion_id) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id },
    include: {
      pedidos: { include: { proveedor: true, lineas: { include: { producto: true } } } },
      costeos: true,
      contenedores: true,
      tramite_aduana: true,
      historial_union: { include: { usuario: { select: { nombre: true } }, pedido: { select: { codigo: true } } } },
    },
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  return importacion
}

export const update = async (empresa_id, importacion_id, data) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  if (importacion.estado === 'cerrada') throw new AppError('No se puede editar una importación cerrada', 400, 'IMPORTACION_CERRADA')

  return await prisma.importacion.update({ where: { importacion_id }, data })
}