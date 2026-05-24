import prisma from '../config/database.js'

export const generarCodigoPedido = async (empresa_id) => {
  const año = new Date().getFullYear()
  const prefix = `PED-${año}-`
  const ultimos = await prisma.pedido.findMany({
    where: { empresa_id, codigo: { startsWith: prefix } },
    select: { codigo: true },
    orderBy: { codigo: 'desc' },
  })
  const maxNum = ultimos.reduce((max, p) => {
    const n = parseInt(p.codigo.replace(prefix, '')) || 0
    return n > max ? n : max
  }, 0)
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`
}

export const generarCodigoImportacion = async (empresa_id) => {
  const año = new Date().getFullYear()
  const prefix = `IMP-${año}-`
  const ultimos = await prisma.importacion.findMany({
    where: { empresa_id, codigo: { startsWith: prefix } },
    select: { codigo: true },
    orderBy: { codigo: 'desc' },
  })
  const maxNum = ultimos.reduce((max, i) => {
    const n = parseInt(i.codigo.replace(prefix, '')) || 0
    return n > max ? n : max
  }, 0)
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`
}
