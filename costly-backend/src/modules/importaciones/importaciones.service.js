// ============================================================
// src/modules/importaciones/importaciones.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { generarCodigoImportacion } from '../../utils/codigo.utils.js'

// ── Helper de validación de fecha (fuera de las funciones)
const validarFechaImportacion = async (fecha_union, pedido_ids) => {
  if (!fecha_union || !pedido_ids?.length) return

  const pedidos = await prisma.pedido.findMany({
    where:  { pedido_id: { in: pedido_ids } },
    select: { pedido_id: true, codigo: true, fecha_pedido: true }
  })

  const fechaImp           = new Date(fecha_union)
  const pedidosPosteriores = pedidos.filter(p => new Date(p.fecha_pedido) > fechaImp)

  if (pedidosPosteriores.length > 0) {
    throw new AppError(
      `La fecha de la importación (${fechaImp.toLocaleDateString('es-CR')}) debe ser posterior ` +
      `a la fecha de todos los pedidos. Pedidos con fecha posterior: ` +
      pedidosPosteriores.map(p =>
        `${p.codigo} (${new Date(p.fecha_pedido).toLocaleDateString('es-CR')})`
      ).join(', '),
      400,
      'FECHA_IMPORTACION_INVALIDA'
    )
  }
}

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
      historial_union: {
        include: {
          usuario: { select: { nombre: true } },
          pedido:  { select: { codigo: true } }
        }
      },
    },
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  return importacion
}

export const update = async (empresa_id, importacion_id, data) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id },
    include: { pedidos: { select: { pedido_id: true } } }
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  if (importacion.estado === 'cerrada')
    throw new AppError('No se puede editar una importación cerrada', 400, 'IMPORTACION_CERRADA')

  // ── Validar fecha si viene en el payload
  if (data.fecha_union) {
    const pedidoIds = importacion.pedidos.map(p => p.pedido_id)
    await validarFechaImportacion(data.fecha_union, pedidoIds)
  }

  return await prisma.importacion.update({ where: { importacion_id }, data })
}

// ── Crear importación uniendo pedidos (llamado desde pedidos.service.js)
// Este service no tiene unirPedidos — está en pedidos.service.js
// Pero agregamos la validación de fecha allí también:
// ➡️ En pedidos.service.js → función unirPedidos(), agregar ANTES del $transaction:
//    await validarFechaImportacion(new Date(), pedido_ids)
//    (importar validarFechaImportacion desde este service o duplicar el helper)

export const remove = async (empresa_id, importacion_id) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id }
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  if (importacion.estado === 'cerrada')
    throw new AppError('No se puede eliminar una importación cerrada', 400, 'IMPORTACION_CERRADA')

  // Verificar que no tenga costeos asociados
  const costeos = await prisma.costeo.findMany({
    where: { importacion_id },
    select: { costeo_id: true, estado: true }
  })
  if (costeos.length > 0) {
    throw new AppError(
      `No se puede eliminar esta importación porque tiene ${costeos.length} costeo${costeos.length > 1 ? 's' : ''} asociado${costeos.length > 1 ? 's' : ''}. ` +
      `Eliminá primero los costeos desde el módulo de Costeos.`,
      400,
      'IMPORTACION_TIENE_COSTEOS'
    )
  }

  return prisma.$transaction(async (tx) => {
    await tx.pedido.updateMany({ where: { importacion_id }, data: { importacion_id: null } })
    await tx.pedidos_historial_union.deleteMany({ where: { importacion_id } })
    return tx.importacion.delete({ where: { importacion_id } })
  })
}

export const addContenedor = async (empresa_id, importacion_id, data) => {
  const importacion = await prisma.importacion.findFirst({ where: { importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  return await prisma.contenedor.create({
    data: {
      importacion_id,
      codigo:        data.codigo || data.nombre || `CONT-${Date.now()}`,
      nota:          data.nota || null,
      tipo:          data.tipo || null,
      naviera:       data.naviera || null,
      bl_numero:     data.bl_numero || null,
      puerto_origen: data.puerto_origen || null,
      puerto_destino:data.puerto_destino || null,
      fecha_salida:  data.fecha_salida ? new Date(data.fecha_salida) : null,
      eta_cr:        data.eta_cr ? new Date(data.eta_cr) : null,
    }
  })
}

export const updateContenedor = async (empresa_id, importacion_id, contenedor_id, data) => {
  const contenedor = await prisma.contenedor.findFirst({
    where: { contenedor_id, importacion: { importacion_id, empresa_id } }
  })
  if (!contenedor) throw new AppError('Contenedor no encontrado', 404, 'CONTENEDOR_NOT_FOUND')
  const { codigo, nombre, ...rest } = data
  return await prisma.contenedor.update({
    where: { contenedor_id },
    data: { ...rest, ...(codigo || nombre ? { codigo: codigo || nombre } : {}) }
  })
}

export const removeContenedor = async (empresa_id, importacion_id, contenedor_id) => {
  const contenedor = await prisma.contenedor.findFirst({
    where: { contenedor_id, importacion: { importacion_id, empresa_id } }
  })
  if (!contenedor) throw new AppError('Contenedor no encontrado', 404, 'CONTENEDOR_NOT_FOUND')
  await prisma.contenedor.delete({ where: { contenedor_id } })
}

export const addPedido = async (empresa_id, importacion_id, pedido_id, usuario_id) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id }
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  if (importacion.estado === 'cerrada')
    throw new AppError('No se puede modificar una importación cerrada', 400, 'IMPORTACION_CERRADA')

  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  if (pedido.importacion_id && pedido.importacion_id !== importacion_id) {
    throw new AppError(
      `El pedido ${pedido.codigo} ya pertenece a otra importación`,
      400, 'PEDIDO_YA_EN_IMPORTACION'
    )
  }

  // ── Validar fecha del pedido vs fecha de la importación
  if (importacion.fecha_union) {
    await validarFechaImportacion(importacion.fecha_union, [pedido_id])
  }

  return prisma.$transaction(async (tx) => {
    await tx.pedido.update({ where: { pedido_id }, data: { importacion_id } })
    await tx.pedidos_historial_union.create({
      data: { importacion_id, pedido_id, accion: 'union', usuario_id, nota: 'Pedido agregado manualmente' }
    })
    const total = await tx.pedido.count({ where: { importacion_id } })
    if (total > 1) {
      await tx.importacion.update({ where: { importacion_id }, data: { consolidado: true } })
    }
    return tx.importacion.findFirst({
      where: { importacion_id },
      include: { pedidos: { include: { proveedor: true } } }
    })
  })
}

export const removePedido = async (empresa_id, importacion_id, pedido_id, usuario_id) => {
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id, empresa_id },
    include: { pedidos: true }
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')
  if (importacion.estado === 'cerrada')
    throw new AppError('No se puede modificar una importación cerrada', 400, 'IMPORTACION_CERRADA')
  if (importacion.pedidos.length <= 1)
    throw new AppError('La importación debe tener al menos un pedido', 400, 'MIN_PEDIDOS')

  const pedido = importacion.pedidos.find(p => p.pedido_id === pedido_id)
  if (!pedido) throw new AppError('El pedido no pertenece a esta importación', 400, 'PEDIDO_NOT_IN_IMP')

  return prisma.$transaction(async (tx) => {
    await tx.pedido.update({ where: { pedido_id }, data: { importacion_id: null } })
    await tx.pedidos_historial_union.create({
      data: { importacion_id, pedido_id, accion: 'separacion', usuario_id, nota: 'Pedido removido manualmente' }
    })
    const restantes = await tx.pedido.count({ where: { importacion_id } })
    if (restantes === 1) {
      await tx.importacion.update({ where: { importacion_id }, data: { consolidado: false } })
    }
    return { ok: true }
  })
}
