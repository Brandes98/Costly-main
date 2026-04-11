// ============================================================
// src/modules/pedidos/pedidos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { generarCodigoPedido, generarCodigoImportacion } from '../../utils/codigo.utils.js'

const TRANSICIONES_VALIDAS = {
  borrador: ['confirmado', 'cancelado'],
  confirmado: ['en_produccion', 'cancelado'],
  en_produccion: ['listo_fabrica', 'cancelado'],
  listo_fabrica: ['embarcado'],
  embarcado: ['en_transito'],
  en_transito: ['en_puerto_cr'],
  en_puerto_cr: ['en_aduana'],
  en_aduana: ['en_bodega'],
  en_bodega: ['entregado'],
  entregado: ['cerrado'],
}

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.pedido.findMany({
    where: {
      empresa_id,
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.proveedor_id && { proveedor_id: parseInt(filters.proveedor_id) }),
      ...(filters.cliente_id && { cliente_id: parseInt(filters.cliente_id) }),
      ...(filters.sin_importacion === 'true' && { importacion_id: null }),
    },
    include: {
      proveedor: { select: { nombre: true, pais: { select: { bandera: true, nombre: true } } } },
      cliente: { select: { nombre: true } },
      hitos: {
        where: { estado: { in: ['pendiente', 'en_proceso'] } },
        orderBy: { fecha_plan: 'asc' },
        take: 1,
      },
      _count: { select: { lineas: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

export const getById = async (empresa_id, pedido_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: {
      proveedor: true,
      cliente: true,
      lineas: { include: { producto: true } },
      facturas: true,
      hitos: { orderBy: { fecha_plan: 'asc' } },
      pagos: true,
      permisos: true,
      proyeccion: { include: { detalle: true } },
    },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  return pedido
}

export const create = async (empresa_id, usuario_id, data) => {
  const codigo = await generarCodigoPedido(empresa_id)

  return await prisma.pedido.create({
    data: {
      empresa_id,
      creado_por: usuario_id,
      codigo,
      proveedor_id: data.proveedor_id,
      cliente_id: data.cliente_id,
      fecha_pedido: new Date(data.fecha_pedido),
      incoterm: data.incoterm,
      moneda: data.moneda,
      estado: 'borrador',
      lineas: {
        create: data.lineas.map((linea, index) => ({
          producto_id: linea.producto_id,
          numero: index + 1,
          cantidad: linea.cantidad,
          precio_unit: linea.precio_unit,
          total_linea: linea.cantidad * linea.precio_unit,
          nota: linea.nota,
        })),
      },
    },
    include: { lineas: { include: { producto: true } } },
  })
}

export const update = async (empresa_id, pedido_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (['cancelado', 'cerrado'].includes(pedido.estado)) {
    throw new AppError('No se puede editar un pedido cancelado o cerrado', 400, 'PEDIDO_LOCKED')
  }
  return await prisma.pedido.update({ where: { pedido_id }, data })
}

export const updateEstado = async (empresa_id, pedido_id, nuevoEstado, usuario_id) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  const permitidos = TRANSICIONES_VALIDAS[pedido.estado] || []
  if (!permitidos.includes(nuevoEstado)) {
    throw new AppError(
      `No se puede cambiar de '${pedido.estado}' a '${nuevoEstado}'`,
      400, 'ESTADO_INVALIDO'
    )
  }
  return await prisma.pedido.update({ where: { pedido_id }, data: { estado: nuevoEstado } })
}

export const unirPedidos = async (empresa_id, usuario_id, pedido_ids, nota) => {
  const pedidos = await prisma.pedido.findMany({
    where: { pedido_id: { in: pedido_ids }, empresa_id }
  })
  if (pedidos.length !== pedido_ids.length) {
    throw new AppError('Uno o más pedidos no encontrados', 404, 'PEDIDOS_NOT_FOUND')
  }
  const yaConsolidados = pedidos.filter(p => p.importacion_id !== null)
  if (yaConsolidados.length > 0) {
    throw new AppError(
      `Los pedidos ${yaConsolidados.map(p => p.codigo).join(', ')} ya están consolidados`,
      400, 'PEDIDOS_YA_CONSOLIDADOS'
    )
  }

  return await prisma.$transaction(async (tx) => {
    const codigo = await generarCodigoImportacion(empresa_id)
    const importacion = await tx.importacion.create({
      data: {
        empresa_id,
        creado_por: usuario_id,
        codigo,
        consolidado: pedido_ids.length > 1,
        fecha_union: new Date(),
        estado: 'en_proceso',
      }
    })
    await tx.pedido.updateMany({
      where: { pedido_id: { in: pedido_ids } },
      data: { importacion_id: importacion.importacion_id }
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
  if (lineasValidas.length !== linea_ids.length) {
    throw new AppError('Una o más líneas no pertenecen a este pedido', 400, 'LINEAS_INVALIDAS')
  }

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.pedido.count({ where: { codigo_padre: pedido.codigo } })
    const subindice = String.fromCharCode(65 + existentes) // A, B, C...

    const subpedido = await tx.pedido.create({
      data: {
        empresa_id,
        creado_por: usuario_id,
        proveedor_id: pedido.proveedor_id,
        cliente_id: pedido.cliente_id,
        codigo: `${pedido.codigo}${subindice}`,
        codigo_padre: pedido.codigo,
        subindice,
        fecha_pedido: pedido.fecha_pedido,
        incoterm: pedido.incoterm,
        moneda: pedido.moneda,
        estado: pedido.estado,
        importacion_id: pedido.importacion_id,
      }
    })
    await tx.linea_pedido.updateMany({
      where: { linea_id: { in: linea_ids } },
      data: { pedido_id: subpedido.pedido_id }
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
  if (pedido.estado === 'cancelado') throw new AppError('El pedido ya está cancelado', 400, 'PEDIDO_YA_CANCELADO')
  await prisma.pedido.update({ where: { pedido_id }, data: { estado: 'cancelado' } })
}