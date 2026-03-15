
// ============================================================
// src/modules/auditoria/auditoria.service.js
// ============================================================
import prisma from '../../config/database.js'
import { parsePagination, buildMeta } from '../../utils/pagination.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  const { page, limit, skip } = parsePagination(filters)

  const where = {
    empresa_id,
    ...(filters.entidad_tipo && { entidad_tipo: filters.entidad_tipo }),
    ...(filters.usuario_id && { usuario_id: parseInt(filters.usuario_id) }),
    ...(filters.accion && { accion: filters.accion }),
    ...(filters.desde && { creado_en: { gte: new Date(filters.desde) } }),
    ...(filters.hasta && { creado_en: { lte: new Date(filters.hasta) } }),
  }

  const [total, registros] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      include: {
        usuario: { select: { nombre: true, email: true } }
      },
      orderBy: { creado_en: 'desc' },
      skip,
      take: limit,
    })
  ])

  return { registros, meta: buildMeta(total, page, limit) }
}
