// ============================================================
// src/modules/empresa/empresa.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

export const get = async (empresa_id) => {
  const empresa = await prisma.empresa.findUnique({ where: { empresa_id } })
  if (!empresa) throw new AppError('Empresa no encontrada', 404, 'EMPRESA_NOT_FOUND')
  return empresa
}

export const update = async (empresa_id, data) => {
  const empresa = await prisma.empresa.findUnique({ where: { empresa_id } })
  if (!empresa) throw new AppError('Empresa no encontrada', 404, 'EMPRESA_NOT_FOUND')

  return await prisma.empresa.update({
    where: { empresa_id },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.cedula_juridica && { cedula_juridica: data.cedula_juridica }),
      ...(data.telefono && { telefono: data.telefono }),
      ...(data.email && { email: data.email }),
      ...(data.direccion && { direccion: data.direccion }),
      ...(data.moneda_base && { moneda_base: data.moneda_base }),
      ...(data.logo_url && { logo_url: data.logo_url }),
    }
  })
}