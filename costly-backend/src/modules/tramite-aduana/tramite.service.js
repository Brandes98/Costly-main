import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const getByImportacion = async (empresa_id, importacion_id) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id },
  })
  if (!importacion) {
    throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  }

  return await prisma.tramite_aduana.findUnique({ where: { importacion_id } })
}

export const upsert = async (empresa_id, importacion_id, data) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id },
  })
  if (!importacion) {
    throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  }

  return await prisma.tramite_aduana.upsert({
    where: { importacion_id },
    update: data,
    create: { importacion_id, ...data },
  })
}
