// ── documentos.service.js
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.documento.findMany({
    where: {
      empresa_id,
      ...(filters.entidad_tipo && { entidad_tipo: filters.entidad_tipo }),
      ...(filters.entidad_id && { entidad_id: parseInt(filters.entidad_id) }),
      ...(filters.tipo_doc && { tipo_doc: filters.tipo_doc }),
    },
    include: { subidor: { select: { nombre: true } } },
    orderBy: { subido_en: 'desc' },
  })
}

export const create = async (empresa_id, usuario_id, data) => {
  return await prisma.documento.create({
    data: { empresa_id, subido_por: usuario_id, ...data }
  })
}

export const remove = async (empresa_id, doc_id) => {
  const doc = await prisma.documento.findFirst({ where: { doc_id, empresa_id } })
  if (!doc) throw new AppError('Documento no encontrado', 404, 'DOC_NOT_FOUND')
  await prisma.documento.delete({ where: { doc_id } })
}