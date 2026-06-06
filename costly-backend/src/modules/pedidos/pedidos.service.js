// ============================================================
// src/modules/pedidos/pedidos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { generarCodigoPedido, generarCodigoImportacion } from '../../utils/codigo.utils.js'
import { registrarAuditoria } from '../../middlewares/audit.middleware.js'

const TRANSICIONES_VALIDAS = {
  borrador:      ['confirmado', 'cancelado'],
  confirmado:    ['en_produccion', 'cancelado', 'borrador'],
  en_produccion: ['listo_fabrica', 'cancelado', 'confirmado'],
  listo_fabrica: ['embarcado', 'en_produccion'],
  embarcado:     ['en_transito', 'listo_fabrica'],
  en_transito:   ['en_puerto_cr', 'embarcado'],
  en_puerto_cr:  ['en_aduana', 'en_transito'],
  en_aduana:     ['en_bodega', 'en_puerto_cr'],
  en_bodega:     ['entregado', 'en_aduana'],
  entregado:     ['cerrado', 'en_bodega'],
}

// ── Helper validación de fecha importación
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
      `La fecha de la importación debe ser posterior a la de todos los pedidos. ` +
      `Pedidos con fecha posterior: ` +
      pedidosPosteriores.map(p =>
        `${p.codigo} (${new Date(p.fecha_pedido).toLocaleDateString('es-CR')})`
      ).join(', '),
      400,
      'FECHA_IMPORTACION_INVALIDA'
    )
  }
}

export const getAll = async (empresa_id, filters = {}) => {
  const pedidos = await prisma.pedido.findMany({
    where: {
      empresa_id,
      ...(filters.estado        && { estado:        filters.estado }),
      ...(filters.proveedor_id  && { proveedor_id:  parseInt(filters.proveedor_id) }),
      ...(filters.cliente_id    && { cliente_id:    parseInt(filters.cliente_id) }),
      ...(filters.sin_importacion === 'true' && { importacion_id: null }),
    },
    include: {
      proveedor: { select: { nombre: true, pais: { select: { bandera: true, nombre: true } } } },
      cliente:   { select: { nombre: true } },
      lineas: {
  select: {
    linea_id:    true,
    total_linea: true,
    cantidad:    true,  
    precio_unit: true,      
    producto: {
      select: { nombre: true, sku: true, categoria: true }
    }
  }
},
importacion: {
  select: {
    estado: true,
    costeos_rel: {
      select: { costeo: { select: { estado: true } } }
    }
  }
},
      pagos:  { select: { monto: true, estado: true } },
      hitos: {
      where: { tipo: 'confirmacion', estado: 'completado' },
      select: { fecha_real: true, tipo: true, estado: true },
      take: 1,
            },
      _count: { select: { lineas: true } },
    },
    orderBy: { creado_en: 'desc' },
  }) 

 return pedidos.map(p => {
  const importacionCerrada    = p.importacion?.estado === 'cerrada'
  const tieneCosteAprobado    = p.importacion?.costeos_rel?.some(r => r.costeo?.estado === 'aprobado')
  const estaConfirmado        = !['borrador','cancelado'].includes(p.estado)

  let etapa_seguimiento = 'pendiente'
  if (importacionCerrada && tieneCosteAprobado) etapa_seguimiento = 'en_bodega'
  else if (importacionCerrada)                  etapa_seguimiento = 'en_aduana'
  else if (estaConfirmado)                      etapa_seguimiento = 'listo_fabrica'

  return { ...p, etapa_seguimiento }
})
}

export const getById = async (empresa_id, pedido_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: {
      proveedor: true,
      cliente:   true,
      lineas:    { include: { producto: true } },
      facturas:  true,
      hitos:     { orderBy: { fecha_plan: 'asc' } },
      pagos:     true,
      permisos:  true,
      proyeccion: { include: { detalle: true } },
    },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  return pedido
}

export const create = async (empresa_id, usuario_id, data) => {
  const fechaPedido = new Date(data.fecha_pedido)
  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  if (fechaPedido > hoy)
    throw new AppError('La fecha del pedido no puede ser futura', 400, 'FECHA_PEDIDO_FUTURA')

  const codigo = await generarCodigoPedido(empresa_id)

  return await prisma.pedido.create({
    data: {
      empresa_id,
      creado_por:   usuario_id,
      codigo,
      proveedor_id: data.proveedor_id,
      cliente_id:   data.cliente_id,
      fecha_pedido: new Date(data.fecha_pedido),
      incoterm:     data.incoterm,
      moneda:       data.moneda,
      nota:         data.nota || null,
      estado:       'borrador',
      forma_pago: data.forma_pago || null, 
      lineas: {
        create: data.lineas.map((linea, index) => ({
          producto_id: linea.producto_id,
          numero:      index + 1,
          cantidad:    linea.cantidad,
          precio_unit: linea.precio_unit,
          total_linea: linea.cantidad * linea.precio_unit,
          nota:        linea.nota || null,
        })),
      },
      hitos: {
        create: [
          { tipo: 'confirmacion',    fecha_plan: new Date(data.fecha_pedido), estado: 'pendiente' },
          { tipo: 'pago_senal',      estado: 'pendiente' },
          { tipo: 'produccion',      estado: 'pendiente' },
          { tipo: 'embarque',        estado: 'pendiente' },
          { tipo: 'llegada_cr',      estado: 'pendiente' },
          { tipo: 'retiro_aduana',   estado: 'pendiente' },
          { tipo: 'entrega_bodega',  estado: 'pendiente' },
          { tipo: 'entrega_cliente', estado: 'pendiente' },
        ]
      },
    },
    include: { lineas: { include: { producto: true } } },
  })
}

export const update = async (empresa_id, pedido_id, data, usuario_id, ip) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (['cancelado', 'cerrado'].includes(pedido.estado))
    throw new AppError('No se puede editar un pedido cancelado o cerrado', 400, 'PEDIDO_LOCKED')

  const { nota_cambio_proveedor, ...updateData } = data

  // Si cambió el proveedor, registrar auditoría
  if (updateData.proveedor_id && updateData.proveedor_id !== pedido.proveedor_id) {
    const provAnterior = await prisma.proveedor.findFirst({ where: { proveedor_id: pedido.proveedor_id } })
    const provNuevo    = await prisma.proveedor.findFirst({ where: { proveedor_id: updateData.proveedor_id } })
    await registrarAuditoria({
      empresa_id, usuario_id,
      accion:        'UPDATE',
      entidad_tipo:  'pedido',
      entidad_id:    pedido_id,
      campo:         'proveedor_id',
      valor_antes:   `${pedido.proveedor_id} — ${provAnterior?.nombre || '?'}`,
      valor_despues: `${updateData.proveedor_id} — ${provNuevo?.nombre || '?'} | Justificación: ${nota_cambio_proveedor || 'Sin nota'}`,
      ip,
    })
  }

  return await prisma.pedido.update({ where: { pedido_id }, data: updateData })
}

export const updateEstado = async (empresa_id, pedido_id, nuevoEstado, usuario_id) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  const permitidos = TRANSICIONES_VALIDAS[pedido.estado] || []
  if (!permitidos.includes(nuevoEstado))
    throw new AppError(`No se puede cambiar de '${pedido.estado}' a '${nuevoEstado}'`, 400, 'ESTADO_INVALIDO')

  const resultado = await prisma.pedido.update({ where: { pedido_id }, data: { estado: nuevoEstado } })

  

  return resultado
}

export const unirPedidos = async (empresa_id, usuario_id, pedido_ids, nota) => {
  const pedidos = await prisma.pedido.findMany({
    where: { pedido_id: { in: pedido_ids }, empresa_id }
  })
  if (pedidos.length !== pedido_ids.length)
    throw new AppError('Uno o más pedidos no encontrados', 404, 'PEDIDOS_NOT_FOUND')

  const yaConsolidados = pedidos.filter(p => p.importacion_id !== null)
  if (yaConsolidados.length > 0)
    throw new AppError(
      `Los pedidos ${yaConsolidados.map(p => p.codigo).join(', ')} ya están consolidados`,
      400, 'PEDIDOS_YA_CONSOLIDADOS'
    )

  // ── Validar fechas
  await validarFechaImportacion(new Date(), pedido_ids)

  return await prisma.$transaction(async (tx) => {
    const codigo      = await generarCodigoImportacion(empresa_id)
    const importacion = await tx.importacion.create({
      data: {
        empresa_id,
        creado_por:  usuario_id,
        codigo,
        consolidado: pedido_ids.length > 1,
        fecha_union: new Date(),
        estado:      'en_proceso',
      }
    })
    await tx.pedido.updateMany({
      where: { pedido_id: { in: pedido_ids } },
      data:  { importacion_id: importacion.importacion_id }
    })
    await tx.pedidos_historial_union.createMany({
      data: pedido_ids.map(pedido_id => ({
        importacion_id: importacion.importacion_id,
        pedido_id,
        accion: 'union',
        usuario_id,
        nota,
      }))
    })
    return importacion
  })
}

export const separarPedido = async (empresa_id, usuario_id, pedido_id, linea_ids, nota) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: true }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  const lineasValidas = pedido.lineas.filter(l => linea_ids.includes(l.linea_id))
  if (lineasValidas.length !== linea_ids.length)
    throw new AppError('Una o más líneas no pertenecen a este pedido', 400, 'LINEAS_INVALIDAS')

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.pedido.count({ where: { codigo_padre: pedido.codigo } })
    const subindice  = String.fromCharCode(65 + existentes)
    const subpedido  = await tx.pedido.create({
      data: {
        empresa_id,
        creado_por:    usuario_id,
        proveedor_id:  pedido.proveedor_id,
        cliente_id:    pedido.cliente_id,
        codigo:        `${pedido.codigo}${subindice}`,
        codigo_padre:  pedido.codigo,
        subindice,
        fecha_pedido:  pedido.fecha_pedido,
        incoterm:      pedido.incoterm,
        moneda:        pedido.moneda,
        estado:        pedido.estado,
        importacion_id:pedido.importacion_id,
      }
    })
    await tx.linea_pedido.updateMany({
      where: { linea_id: { in: linea_ids } },
      data:  { pedido_id: subpedido.pedido_id }
    })
    await tx.pedidos_historial_union.create({
      data: { pedido_id, accion: 'separacion', usuario_id, nota }
    })
    return subpedido
  })
}

export const cancel = async (empresa_id, usuario_id, pedido_id, motivo) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (pedido.estado === 'cancelado')
    throw new AppError('El pedido ya está cancelado', 400, 'PEDIDO_YA_CANCELADO')
  await prisma.pedido.update({ where: { pedido_id }, data: { estado: 'cancelado' } })
}

export const addLinea = async (empresa_id, pedido_id, data) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: true }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (['cancelado','cerrado'].includes(pedido.estado))
    throw new AppError('No se puede modificar un pedido cancelado o cerrado', 400, 'PEDIDO_LOCKED')

  const numero = (pedido.lineas.length > 0 ? Math.max(...pedido.lineas.map(l => l.numero)) : 0) + 1
  return prisma.linea_pedido.create({
    data: {
      pedido_id,
      producto_id: data.producto_id,
      numero,
      cantidad:    data.cantidad,
      precio_unit: data.precio_unit,
      total_linea: data.cantidad * data.precio_unit,
      nota:        data.nota || null,
    },
    include: { producto: true }
  })
}

export const updateLinea = async (empresa_id, pedido_id, linea_id, data) => {
  const linea = await prisma.linea_pedido.findFirst({
    where: { linea_id, pedido: { pedido_id, empresa_id } }
  })
  if (!linea) throw new AppError('Línea no encontrada', 404, 'LINEA_NOT_FOUND')

  const cantidad    = data.cantidad    ?? linea.cantidad
  const precio_unit = data.precio_unit ?? linea.precio_unit

  return prisma.linea_pedido.update({
    where: { linea_id },
    data: {
      cantidad,
      precio_unit,
      total_linea: Number(cantidad) * Number(precio_unit),
      ...(data.nota !== undefined && { nota: data.nota }),
    },
    include: { producto: true }
  })
}

export const deleteLinea = async (empresa_id, pedido_id, linea_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: true }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (pedido.lineas.length <= 1)
    throw new AppError('El pedido debe tener al menos una línea', 400, 'MIN_LINEAS')

  const linea = pedido.lineas.find(l => l.linea_id === linea_id)
  if (!linea) throw new AppError('Línea no encontrada', 404, 'LINEA_NOT_FOUND')

  return prisma.linea_pedido.delete({ where: { linea_id } })
}
