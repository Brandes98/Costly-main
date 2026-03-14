// ============================================================
// src/modules/pedidos/proyeccion.service.js  ← archivo separado dentro de pedidos
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { calcularProyeccion } from '../../utils/proyeccion.utils.js'

export const get = async (empresa_id, pedido_id) => {
  const proyeccion = await prisma.proyeccion_volumen.findFirst({
    where: { pedido: { pedido_id, empresa_id } },
    include: { detalle: true },
  })
  if (!proyeccion) throw new AppError('No hay proyección calculada para este pedido', 404, 'PROYECCION_NOT_FOUND')
  return proyeccion
}

export const calcular = async (empresa_id, pedido_id, opts = {}) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: { include: { producto: true } } },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (!pedido.lineas.length) throw new AppError('El pedido no tiene líneas', 400, 'SIN_LINEAS')

  const resultado = calcularProyeccion(pedido.lineas, opts.tipo_pallet_default)
  const detalleDb = resultado.detalle.map((det) => ({
    linea_id: det.linea_id,
    tipo_estiba_usado: det.tipo_estiba_usado,
    volumen_m3: det.volumen_m3,
    peso_kg: det.peso_kg,
    pallets_necesarios: det.pallets_necesarios,
    es_especial: det.es_especial,
    nota: det.nota,
  }))

  const proyeccion = await prisma.proyeccion_volumen.upsert({
    where: { pedido_id },
    update: { ...resultado, calculado_en: new Date(), detalle: { deleteMany: {}, create: detalleDb } },
    create: { pedido_id, ...resultado, detalle: { create: detalleDb } },
    include: { detalle: true },
  })

  // Actualizar campos calculados en cada línea
  for (const det of resultado.detalle) {
    await prisma.linea_pedido.update({
      where: { linea_id: det.linea_id },
      data: {
        volumen_total_m3: det.volumen_m3,
        peso_total_kg: det.peso_kg,
        cajas_estimadas: det.cajas_estimadas,
      }
    })
  }

  return proyeccion
}

export const detalle = async (empresa_id, pedido_id) => {
  const proyeccion = await prisma.proyeccion_volumen.findFirst({
    where: { pedido: { pedido_id, empresa_id } },
    include: {
      detalle: {
        include: {
          linea_pedido: { include: { producto: { select: { nombre: true, sku: true } } } }
        }
      }
    },
  })
  if (!proyeccion) throw new AppError('No hay proyección calculada para este pedido', 404, 'PROYECCION_NOT_FOUND')
  return proyeccion
}
