// ============================================================
// src/modules/empresa/empresa.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'

const optStringToNull = (value) => (value === undefined ? undefined : value === '' ? null : value)

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
      nombre: data.nombre,
      ruc: data.ruc,
      telefono: data.telefono,
      email: data.email,
      direccion: data.direccion,
      moneda_base: data.moneda_base,
      iva_pct: data.iva_pct,
      ivi_pct: data.ivi_pct,
      margen_default: data.margen_default,
      tc_fuente: data.tc_fuente,
      telefono: optStringToNull(data.telefono),
      email: optStringToNull(data.email),
      direccion: optStringToNull(data.direccion),
      logo_url: optStringToNull(data.logo_url),
    }
  })
}
