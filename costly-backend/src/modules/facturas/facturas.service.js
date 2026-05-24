// ============================================================
// src/modules/facturas/facturas.service.js
// ============================================================
import prisma  from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import path    from 'path'
import fs      from 'fs'

export const getByPedido = async (empresa_id, pedido_id) => {
  return await prisma.factura_prov.findMany({
    where: { pedido_id, pedido: { empresa_id } },
    include: { proveedor: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
  })
}

export const create = async (empresa_id, usuario_id, data, file) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id: data.pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  const existe = await prisma.factura_prov.findFirst({ where: { numero: data.numero } })
  if (existe) throw new AppError(`Ya existe una factura con número ${data.numero}`, 400, 'FACTURA_DUPLICADA')

  return await prisma.$transaction(async (tx) => {
    const factura = await tx.factura_prov.create({
      data: {
        pedido_id:    data.pedido_id,
        proveedor_id: data.proveedor_id || pedido.proveedor_id,
        numero:       data.numero,
        fecha:        new Date(data.fecha),
        monto:        Number(data.monto),
        moneda:       data.moneda || 'USD',
        tipo:         data.tipo   || 'comercial',
        nota:         data.nota   || null,
        archivo_url:  file ? `/uploads/facturas/${file.filename}` : null,
      }
    })
    if (file) {
      await tx.documento.create({
        data: {
          empresa_id,
          subido_por:   usuario_id,
          entidad_tipo: 'pedido',
          entidad_id:   data.pedido_id,
          tipo_doc:     'factura',
          nombre:       file.originalname,
          url:          `/uploads/facturas/${file.filename}`,
          tamanio_kb:   Math.round(file.size / 1024),
          mime_type:    file.mimetype,
        }
      })
    }
    return factura
  })
}

export const update = async (empresa_id, factura_id, data, file) => {
  const factura = await prisma.factura_prov.findFirst({
    where: { factura_id, pedido: { empresa_id } }
  })
  if (!factura) throw new AppError('Factura no encontrada', 404, 'FACTURA_NOT_FOUND')

  if (file && factura.archivo_url) {
    const oldPath = path.join(process.cwd(), 'public', factura.archivo_url)
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }

  return await prisma.factura_prov.update({
    where: { factura_id },
    data: {
      ...(data.numero  && { numero:  data.numero }),
      ...(data.fecha   && { fecha:   new Date(data.fecha) }),
      ...(data.monto   && { monto:   Number(data.monto) }),
      ...(data.moneda  && { moneda:  data.moneda }),
      ...(data.tipo    && { tipo:    data.tipo }),
      ...(data.nota !== undefined && { nota: data.nota || null }),
      ...(file && { archivo_url: `/uploads/facturas/${file.filename}` }),
    }
  })
}

export const remove = async (empresa_id, factura_id) => {
  const factura = await prisma.factura_prov.findFirst({
    where: { factura_id, pedido: { empresa_id } }
  })
  if (!factura) throw new AppError('Factura no encontrada', 404, 'FACTURA_NOT_FOUND')

  if (factura.archivo_url) {
    const filePath = path.join(process.cwd(), 'public', factura.archivo_url)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  await prisma.factura_prov.delete({ where: { factura_id } })
}
