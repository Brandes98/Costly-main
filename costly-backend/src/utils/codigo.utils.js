import prisma from '../config/database.js'

export const generarCodigoPedido = async (empresa_id) => {
  const año = new Date().getFullYear()
  const count = await prisma.pedido.count({
    where: { empresa_id, codigo: { startsWith: `PED-${año}` } }
  })
  return `PED-${año}-${String(count + 1).padStart(3, '0')}`
}

export const generarCodigoImportacion = async (empresa_id) => {
  const año = new Date().getFullYear()
  const count = await prisma.importacion.count({
    where: { empresa_id, codigo: { startsWith: `IMP-${año}` } }
  })
  return `IMP-${año}-${String(count + 1).padStart(3, '0')}`
}
