import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { parsePagination, buildMeta } from '../../utils/pagination.utils.js'

export const getAll = async (empresa_id, usuario_id, filters = {}) => {
  const { page, limit, skip } = parsePagination(filters)
  const where = {
    empresa_id,
    OR: [{ publico: true }, { usuario_id }],
    ...(filters.tipo && { tipo: filters.tipo }),
  }
  const [total, reportes] = await Promise.all([
    prisma.reporte.count({ where }),
    prisma.reporte.findMany({
      where,
      include: { usuario: { select: { nombre: true } } },
      orderBy: { creado_en: 'desc' },
      skip,
      take: limit,
    })
  ])
  return { reportes, meta: buildMeta(total, page, limit) }
}

export const getById = async (empresa_id, reporte_id) => {
  const reporte = await prisma.reporte.findFirst({
    where: { reporte_id, empresa_id },
    include: { usuario: { select: { nombre: true } } },
  })
  if (!reporte) throw new AppError('Reporte no encontrado', 404, 'REPORTE_NOT_FOUND')
  return reporte
}

export const generar = async (empresa_id, body) => {
  const { tipo, config = {} } = body
  const handlers = {
    pedidos:       r_pedidos,
    importaciones: r_importaciones,
    costeos:       r_costeos,
    seguimiento:   r_seguimiento,
    proveedores:   r_proveedores,
    productos:     r_productos,
    clientes:      r_clientes,
    r01: r01_pedidos_activos,
    r02: r02_importaciones_estado,
    r03: r03_costeos_por_importacion,
    r04: r04_pagos_pendientes,
    r05: r05_hitos_vencidos,
    r06: r06_proyeccion_volumen,
    r07: r07_productos_mas_pedidos,
    r08: r08_proveedores_activos,
    r09: r09_permisos_por_vencer,
    r10: r10_tc_historico,
    r11: r11_utilidad_por_importacion,
    r12: r12_documentos_por_entidad,
    dinamico: r_dinamico,
    pagos: r_pagos,
    merge:    r_merge,
  }
  const handler = handlers[tipo]
  if (!handler) throw new AppError(`Tipo de reporte '${tipo}' no existe`, 400, 'TIPO_INVALIDO')
  const data = await handler(empresa_id, config)
  return { tipo, generado_en: new Date(), total: Array.isArray(data) ? data.length : null, data }
}

export const save = async (empresa_id, usuario_id, data) => {
  return await prisma.reporte.create({
    data: {
      empresa_id,
      usuario_id,
      nombre:      data.nombre,
      tipo:        data.tipo,
      config_json: data.config_json || {},
      publico:     data.publico ?? false,
    }
  })
}

export const remove = async (empresa_id, reporte_id) => {
  const reporte = await prisma.reporte.findFirst({ where: { reporte_id, empresa_id } })
  if (!reporte) throw new AppError('Reporte no encontrado', 404, 'REPORTE_NOT_FOUND')
  await prisma.reporte.delete({ where: { reporte_id } })
}

// ══════════════════════════════════════════════════════════════
// HANDLERS PREDEFINIDOS
// ══════════════════════════════════════════════════════════════

const r01_pedidos_activos = async (empresa_id, config) => {
  return await prisma.pedido.findMany({
    where: {
      empresa_id,
      estado: { notIn: ['cerrado', 'cancelado'] },
      ...(config.proveedor_id && { proveedor_id: config.proveedor_id }),
      ...(config.estado       && { estado: config.estado }),
    },
    include: {
      proveedor: { select: { nombre: true, pais: { select: { bandera: true, nombre: true } } } },
      cliente:   { select: { nombre: true } },
      hitos: {
        where:   { estado: { in: ['pendiente', 'en_proceso'] } },
        orderBy: { fecha_plan: 'asc' },
        take: 1,
        select:  { tipo: true, fecha_plan: true, estado: true },
      },
      _count: { select: { lineas: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

const r02_importaciones_estado = async (empresa_id, config) => {
  return await prisma.importacion.findMany({
    where: {
      empresa_id,
      ...(config.estado && { estado: config.estado }),
    },
    include: {
      pedidos:     { select: { pedido_id: true, codigo: true, estado: true } },
      contenedores:{ select: { codigo: true, tipo: true, eta_cr: true, estado: true } },
      _count:      { select: { pedidos: true, costeos: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

const r03_costeos_por_importacion = async (empresa_id, config) => {
  return await prisma.costeo.findMany({
    where: {
      importaciones_rel: { some: { importacion: { empresa_id } } },
      ...(config.estado && { estado: config.estado }),
    },
    include: {
      importaciones_rel: { include: { importacion: { select: { codigo: true, estado: true } } } },
      creador:   { select: { nombre: true } },
      aprobador: { select: { nombre: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

const r04_pagos_pendientes = async (empresa_id, config) => {
  const pedidos = await prisma.pedido.findMany({
    where: {
      empresa_id,
      estado: { notIn: ['borrador', 'cancelado'] },
    },
    include: {
      proveedor: { select: { nombre: true } },
      lineas:    { select: { total_linea: true } },
      pagos:     { select: { monto: true, estado: true, tipo: true, fecha_limite: true, fecha_pago: true } },
    },
    orderBy: { creado_en: 'desc' },
  })

  return pedidos.map(p => {
    const total     = p.lineas.reduce((s,l) => s + Number(l.total_linea||0), 0)
    const pagado    = p.pagos.filter(pg => pg.estado === 'confirmado').reduce((s,pg) => s + Number(pg.monto||0), 0)
    const saldo     = total - pagado
    const overpaid  = pagado > total

    return {
      ...p,
      total,
      pagado,
      saldo:    Math.abs(saldo),
      estado_pago: overpaid ? 'pagado_demas'
        : saldo <= 0        ? 'pagado'
        : pagado > 0        ? 'pago_parcial'
        : 'pendiente',
    }
  })
}

const r05_hitos_vencidos = async (empresa_id, config) => {
  const hoy = new Date()
  const dias = config.dias_alerta || 3
  const limite = new Date(hoy.getTime() + dias * 86400000)
  return await prisma.hito.findMany({
    where: {
      pedido: { empresa_id },
      estado: { in: ['pendiente', 'en_proceso'] },
      fecha_plan: { lte: limite },
    },
    include: {
      pedido:      { select: { codigo: true, estado: true } },
      responsable: { select: { nombre: true } },
    },
    orderBy: { fecha_plan: 'asc' },
  })
}

const r06_proyeccion_volumen = async (empresa_id, config) => {
  return await prisma.proyeccion_volumen.findMany({
    where: { pedido: { empresa_id, estado: { notIn: ['cerrado', 'cancelado'] } } },
    include: {
      pedido:  { select: { codigo: true, estado: true, proveedor: { select: { nombre: true } } } },
      detalle: { include: { linea_pedido: { include: { producto: { select: { nombre: true, sku: true } } } } } },
    },
    orderBy: { calculado_en: 'desc' },
  })
}

const r07_productos_mas_pedidos = async (empresa_id, config) => {
  const desde = config.desde ? new Date(config.desde) : new Date(Date.now() - 365 * 86400000)
  const lineas = await prisma.linea_pedido.groupBy({
    by: ['producto_id'],
    where: { pedido: { empresa_id, creado_en: { gte: desde }, estado: { not: 'cancelado' } } },
    _count: { producto_id: true },
    _sum:   { cantidad: true, total_linea: true },
    orderBy: { _count: { producto_id: 'desc' } },
    take: config.top || 20,
  })
  const ids = lineas.map(l => l.producto_id)
  const productos = await prisma.producto.findMany({
    where: { producto_id: { in: ids } },
    select: { producto_id: true, nombre: true, sku: true, categoria: true },
  })
  const mapProd = Object.fromEntries(productos.map(p => [p.producto_id, p]))
  return lineas.map(l => ({
    producto: mapProd[l.producto_id] || { producto_id: l.producto_id },
    pedidos:  l._count.producto_id,
    cantidad_total: l._sum.cantidad,
    monto_total:    l._sum.total_linea,
  }))
}

const r08_proveedores_activos = async (empresa_id, config) => {
  const desde = config.desde ? new Date(config.desde) : new Date(Date.now() - 365 * 86400000)
  return await prisma.proveedor.findMany({
    where: { empresa_id, activo: true, pedidos: { some: { creado_en: { gte: desde } } } },
    include: {
      pais: { select: { nombre: true, bandera: true } },
      _count: { select: { pedidos: true } },
    },
    orderBy: { nombre: 'asc' },
  })
}

const r09_permisos_por_vencer = async (empresa_id, config) => {
  const hoy = new Date()
  const dias = config.dias_alerta || 30
  const limite = new Date(hoy.getTime() + dias * 86400000)
  return await prisma.permiso.findMany({
    where: {
      pedido: { empresa_id },
      estado: { in: ['aprobado'] },
      fecha_vencimiento: { lte: limite, gte: hoy },
    },
    include: {
      pedido:   { select: { codigo: true } },
      producto: { select: { nombre: true, sku: true } },
    },
    orderBy: { fecha_vencimiento: 'asc' },
  })
}

const r10_tc_historico = async (empresa_id, config) => {
  return await prisma.tc_historico.findMany({
    where: {
      empresa_id,
      ...(config.desde && { fecha: { gte: new Date(config.desde) } }),
      ...(config.hasta && { fecha: { lte: new Date(config.hasta) } }),
    },
    orderBy: { fecha: 'desc' },
    take: config.limit || 90,
  })
}

const r11_utilidad_por_importacion = async (empresa_id, config) => {
  const costeos = await prisma.costeo.findMany({
    where: {
      importaciones_rel: { some: { importacion: { empresa_id } } },
      estado: 'aprobado',
      ...(config.desde && { creado_en: { gte: new Date(config.desde) } }),
      ...(config.hasta && { creado_en: { lte: new Date(config.hasta) } }),
    },
    include: {
      importaciones_rel: { include: { importacion: { select: { codigo: true, creado_en: true } } } },
    },
    orderBy: { creado_en: 'desc' },
  })
  return costeos.map(c => ({
    importacion:        c.importaciones_rel?.map(r => r.importacion?.codigo).join(' + ') || '—',
    fecha:              c.importaciones_rel?.[0]?.importacion?.creado_en,
    costo_origen:       c.costo_origen,
    costo_total_cr:     c.costo_total_cr,
    precio_venta_total: c.precio_venta_total,
    utilidad_bruta:     c.utilidad_bruta,
    margen_global:      c.margen_global,
    tc_usd_crc:         c.tc_usd_crc,
  }))
}

const r12_documentos_por_entidad = async (empresa_id, config) => {
  return await prisma.documento.findMany({
    where: {
      empresa_id,
      ...(config.entidad_tipo && { entidad_tipo: config.entidad_tipo }),
      ...(config.tipo_doc     && { tipo_doc: config.tipo_doc }),
    },
    include: { subidor: { select: { nombre: true } } },
    orderBy: { subido_en: 'desc' },
    take: config.limit || 100,
  })
}

const r_dinamico = async (empresa_id, config) => {
  return await prisma.pedido.findMany({
    where: {
      empresa_id,
      ...(config.estado       && { estado: config.estado }),
      ...(config.proveedor_id && { proveedor_id: config.proveedor_id }),
      ...(config.cliente_id   && { cliente_id: config.cliente_id }),
      ...(config.desde        && { creado_en: { gte: new Date(config.desde) } }),
      ...(config.hasta        && { creado_en: { lte: new Date(config.hasta) } }),
    },
    include: {
      proveedor:  { select: { nombre: true } },
      cliente:    { select: { nombre: true } },
      lineas:     { include: { producto: { select: { nombre: true, sku: true } } } },
      proyeccion: true,
    },
    orderBy: { creado_en: 'desc' },
    take: config.limit || 200,
  })
}

// ══════════════════════════════════════════════════════════════
// NUEVOS HANDLERS — fecha_inicio / fecha_fin
// ══════════════════════════════════════════════════════════════

const buildFechaWhere = (config, campo = 'creado_en') => {
  if (!config.fecha_inicio && !config.fecha_fin) return {}
  const cond = {}
  if (config.fecha_inicio) cond.gte = new Date(config.fecha_inicio + 'T00:00:00.000Z')
  if (config.fecha_fin)    cond.lte = new Date(config.fecha_fin    + 'T23:59:59.999Z')
  return { [campo]: cond }
}

const r_pedidos = async (empresa_id, config) => {
  return await prisma.pedido.findMany({
    where: {
      empresa_id,
      ...buildFechaWhere(config, 'fecha_pedido'),
      ...(config.estado       && { estado:       config.estado }),
      ...(config.proveedor_id && { proveedor_id: parseInt(config.proveedor_id) }),
      ...(config.cliente_id   && { cliente_id:   parseInt(config.cliente_id) }),
    },
    include: {
      proveedor:  { select: { nombre: true, pais: { select: { bandera: true, nombre: true } } } },
      cliente:    { select: { nombre: true } },
      lineas:     { include: { producto: { select: { nombre: true, sku: true, categoria: true } } } },
      hitos:      { orderBy: { fecha_plan: 'asc' } },
      facturas:   true,
      pagos:      true,
      _count:     { select: { lineas: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

const r_importaciones = async (empresa_id, config) => {
  return await prisma.importacion.findMany({
    where: {
      empresa_id,
      ...buildFechaWhere(config),
      ...(config.estado && { estado: config.estado }),
    },
    include: {
      pedidos:      { include: { proveedor: { select: { nombre: true } }, lineas: { include: { producto: true } } } },
      contenedores: true,
      costeos:      true,
      _count:       { select: { pedidos: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

const r_costeos = async (empresa_id, config) => {
  const costeos = await prisma.costeo.findMany({
    where: {
      importaciones_rel: { some: { importacion: { empresa_id } } },
      ...buildFechaWhere(config),
      ...(config.estado && { estado: config.estado }),
    },
    include: {
      importaciones_rel: { include: { importacion: { select: { codigo: true, estado: true } } } },
      lineas_costeo: {
        include: {
          linea_pedido: { include: { producto: { select: { nombre: true, sku: true, categoria: true } } } }
        }
      },
      creador:   { select: { nombre: true } },
      aprobador: { select: { nombre: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
  return costeos.map(c => ({
    costeo_id:          c.costeo_id,
    estado:             c.estado,
    importaciones:      c.importaciones_rel.map(r => r.importacion?.codigo).join(' + '),
    creado_por:         c.creador?.nombre,
    aprobado_por:       c.aprobador?.nombre,
    creado_en:          c.creado_en,
    aprobado_en:        c.aprobado_en,
    tc_usd_crc:         c.tc_usd_crc,
    costo_origen:       c.costo_origen,
    flete_maritimo:     c.flete_maritimo,
    seguro:             c.seguro,
    valor_cif:          c.valor_cif,
    arancel_pct:        c.arancel_pct,
    arancel_monto:      c.arancel_monto,
    isc_pct:            c.isc_pct,
    isc_monto:          c.isc_monto,
    agente_aduana:      c.agente_aduana,
    flete_cr:           c.flete_cr,
    bodega_costo:       c.bodega_costo,
    otros_costos:       c.otros_costos,
    costo_total_cr:     c.costo_total_cr,
    margen_global:      c.margen_global,
    precio_venta_total: c.precio_venta_total,
    utilidad_bruta:     c.utilidad_bruta,
    lineas: c.lineas_costeo.map(l => ({
      producto:       l.linea_pedido?.producto?.nombre,
      sku:            l.linea_pedido?.producto?.sku,
      categoria:      l.linea_pedido?.producto?.categoria,
      cantidad:       l.linea_pedido?.cantidad,
      total_linea:    l.linea_pedido?.total_linea,
      pct_peso:       l.pct_peso,
      dist_logistica: l.dist_logistica,
      costo_unit_cr:  l.costo_unit_cr,
      margen_pct:     l.margen_pct,
      precio_venta_u: l.precio_venta_u,
      precio_venta_t: l.precio_venta_t,
      utilidad:       l.utilidad,
    }))
  }))
}

const r_seguimiento = async (empresa_id, config) => {
  return await prisma.pedido.findMany({
    where: {
      empresa_id,
      ...buildFechaWhere(config),
      ...(config.estado && { estado: config.estado }),
    },
    include: {
      proveedor: { select: { nombre: true } },
      cliente:   { select: { nombre: true } },
      hitos:     { orderBy: { fecha_plan: 'asc' } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

// ── Catálogos sin buildFechaWhere (no tienen creado_en)
const r_proveedores = async (empresa_id, config) => {
  return await prisma.proveedor.findMany({
    where: {
      empresa_id,
      ...(config.activo !== undefined && { activo: config.activo }),
    },
    include: {
      pais:      { select: { nombre: true, bandera: true } },
      contactos: { where: { activo: true } },
      _count:    { select: { pedidos: true } },
    },
    orderBy: { nombre: 'asc' },
  })
}

const r_productos = async (empresa_id, config) => {
  return await prisma.producto.findMany({
    where: {
      empresa_id,
      ...(config.activo    !== undefined && { activo:    config.activo }),
      ...(config.categoria && { categoria: config.categoria }),
    },
    orderBy: { nombre: 'asc' },
  })
}

const r_clientes = async (empresa_id, config) => {
  return await prisma.cliente.findMany({
    where: {
      empresa_id,
      ...(config.tipo   && { tipo:  config.tipo }),
      ...(config.activo !== undefined && { activo: config.activo }),
    },
    orderBy: { nombre: 'asc' },
  })
}

// ══════════════════════════════════════════════════════════════
// R-MERGE — Tabla desnormalizada árbol jerárquico
// Proveedor → Pedido → Seguimiento → Importación → Costeo → Línea/Producto → Cliente
// ══════════════════════════════════════════════════════════════
const r_merge = async (empresa_id, config) => {
  const secciones = config.secciones || []
  if (!secciones.length) return []

  const fecha_inicio = config.fecha_inicio
  const fecha_fin    = config.fecha_fin

  const tieneProductos     = secciones.includes('productos')
  const tieneCosteos       = secciones.includes('costeos')
  const tienePedidos       = secciones.includes('pedidos')
  const tieneImportaciones = secciones.includes('importaciones')
  const tieneSeguimiento   = secciones.includes('seguimiento')
  const tieneProveedores   = secciones.includes('proveedores')
  const tieneClientes      = secciones.includes('clientes')

  const ejeLineas = tienePedidos || tieneCosteos || tieneProductos || tieneImportaciones || tieneSeguimiento

  if (ejeLineas) {
    const pedidos = await prisma.pedido.findMany({
      where: {
        empresa_id,
        ...buildFechaWhere({ fecha_inicio, fecha_fin }, 'fecha_pedido'),
        ...(config.estado_pedido && { estado: config.estado_pedido }),
        ...(config.proveedor_id  && { proveedor_id: parseInt(config.proveedor_id) }),
        ...(config.cliente_id    && { cliente_id:   parseInt(config.cliente_id)   }),
      },
      include: {
        proveedor:   { include: { pais: { select: { nombre: true, bandera: true } } } },
        cliente:     true,
        lineas:      { include: { producto: true } },
        hitos:       { orderBy: { fecha_plan: 'asc' } },
        importacion: {
          include: {
            // Relación directa importacion → costeo via importacion_id
            costeos:      { include: { lineas_costeo: true }, take: 1 },
            // Relación N:M via costeo_importacion
            costeos_rel:  { include: { costeo: { include: { lineas_costeo: true } } }, take: 1 },
            contenedores: { take: 1 },
          }
        },
      },
      orderBy: { creado_en: 'desc' },
    })

    const filas = []
    const ORDEN_HITOS = ['confirmacion','pago_senal','produccion','embarque','llegada_cr','retiro_aduana','entrega_bodega','entrega_cliente']

    for (const pedido of pedidos) {
      const costeo = pedido.importacion?.costeos?.[0] ?? pedido.importacion?.costeos_rel?.[0]?.costeo ?? null

      for (const linea of (pedido.lineas || [])) {
        const costoLinea = costeo?.lineas_costeo?.find(lc => lc.linea_id === linea.linea_id) ?? null
        const fila = {}

        if (tieneProveedores) {
          fila.prov_nombre        = pedido.proveedor?.nombre
          fila.prov_pais          = `${pedido.proveedor?.pais?.bandera||''} ${pedido.proveedor?.pais?.nombre||''}`.trim()
          fila.prov_ciudad        = pedido.proveedor?.ciudad
          fila.prov_moneda        = pedido.proveedor?.moneda
          fila.prov_incoterm      = pedido.proveedor?.incoterm_pref
          fila.prov_dias_transito = pedido.proveedor?.dias_transito
        }
        if (tienePedidos) {
          fila.ped_codigo    = pedido.codigo
          fila.ped_estado    = pedido.estado
          fila.ped_fecha     = pedido.fecha_pedido
          fila.ped_incoterm  = pedido.incoterm
          fila.ped_moneda    = pedido.moneda
          fila.ped_nota      = pedido.nota
          fila.ped_creado_en = pedido.creado_en
        }
        if (tieneSeguimiento) {
          const hitosOrdenados = [...(pedido.hitos||[])].sort((a,b) => ORDEN_HITOS.indexOf(a.tipo) - ORDEN_HITOS.indexOf(b.tipo))
          const proxHito = hitosOrdenados.find(h => !h.fecha_real && h.fecha_plan)
          const ultHito  = [...hitosOrdenados].reverse().find(h => h.fecha_real)
          fila.seg_prox_hito       = proxHito?.tipo
          fila.seg_prox_fecha_plan = proxHito?.fecha_plan
          fila.seg_ult_hito        = ultHito?.tipo
          fila.seg_ult_fecha_real  = ultHito?.fecha_real
        }
        if (tieneImportaciones) {
          fila.imp_codigo      = pedido.importacion?.codigo
          fila.imp_estado      = pedido.importacion?.estado
          fila.imp_fecha_union = pedido.importacion?.fecha_union
          fila.imp_contenedor  = pedido.importacion?.contenedores?.[0]?.codigo
          fila.imp_eta_cr      = pedido.importacion?.contenedores?.[0]?.eta_cr
        }
        if (tieneCosteos && costeo) {
          fila.cos_tc         = costeo.tc_usd_crc
          fila.cos_cif        = costeo.valor_cif
          fila.cos_arancel    = costeo.arancel_monto
          fila.cos_flete      = costeo.flete_maritimo
          fila.cos_agente     = costeo.agente_aduana
          fila.cos_flete_cr   = costeo.flete_cr
          fila.cos_bodega     = costeo.bodega_costo
          fila.cos_total_cr   = costeo.costo_total_cr
          fila.cos_margen     = costeo.margen_global
          fila.cos_pv_total   = costeo.precio_venta_total
          fila.cos_utilidad   = costeo.utilidad_bruta
          if (costoLinea) {
            fila.cos_lin_costo_unit = costoLinea.costo_unit_cr
            fila.cos_lin_margen_pct = costoLinea.margen_pct
            fila.cos_lin_pv_unit    = costoLinea.precio_venta_u
            fila.cos_lin_pv_total   = costoLinea.precio_venta_t
            fila.cos_lin_utilidad   = costoLinea.utilidad
          }
        }
        if (tieneProductos) {
          fila.prod_nombre      = linea.producto?.nombre
          fila.prod_sku         = linea.producto?.sku
          fila.prod_categoria   = linea.producto?.categoria
          fila.prod_peso_kg     = linea.producto?.peso_kg
          fila.prod_volumen_m3  = linea.producto?.volumen_m3
          fila.prod_arancel_pct = linea.producto?.arancel_pct
          fila.lin_cantidad     = linea.cantidad
          fila.lin_precio_unit  = linea.precio_unit
          fila.lin_total        = linea.total_linea
        } else {
          fila.prod_nombre  = linea.producto?.nombre
          fila.prod_sku     = linea.producto?.sku
          fila.lin_cantidad = linea.cantidad
          fila.lin_total    = linea.total_linea
        }
        if (tieneClientes) {
          fila.cli_nombre    = pedido.cliente?.nombre
          fila.cli_tipo      = pedido.cliente?.tipo
          fila.cli_moneda    = pedido.cliente?.moneda
          fila.cli_descuento = pedido.cliente?.descuento_pct
        }
        filas.push(fila)
      }
    }
    return filas
  }

  // Proveedor + Producto sin operaciones — unir via pedidos históricos
  if (tieneProveedores && tieneProductos) {
    const provs = await prisma.proveedor.findMany({
      where: { empresa_id },
      include: {
        pais: { select: { nombre: true, bandera: true } },
        pedidos: { include: { lineas: { include: { producto: true } } }, take: 100 }
      },
      orderBy: { nombre: 'asc' },
    })
    const filas = []
    for (const prov of provs) {
      const prodMap = new Map()
      for (const ped of (prov.pedidos||[])) {
        for (const linea of (ped.lineas||[])) {
          if (linea.producto && !prodMap.has(linea.producto.producto_id))
            prodMap.set(linea.producto.producto_id, linea.producto)
        }
      }
      const productos = prodMap.size > 0 ? [...prodMap.values()] : [null]
      for (const prod of productos) {
        const fila = {}
        fila.prov_nombre        = prov.nombre
        fila.prov_pais          = `${prov.pais?.bandera||''} ${prov.pais?.nombre||''}`.trim()
        fila.prov_ciudad        = prov.ciudad
        fila.prov_moneda        = prov.moneda
        fila.prov_incoterm      = prov.incoterm_pref
        fila.prov_dias_transito = prov.dias_transito
        if (prod) {
          fila.prod_nombre      = prod.nombre
          fila.prod_sku         = prod.sku
          fila.prod_categoria   = prod.categoria
          fila.prod_peso_kg     = prod.peso_kg
          fila.prod_volumen_m3  = prod.volumen_m3
          fila.prod_arancel_pct = prod.arancel_pct
        }
        filas.push(fila)
      }
    }
    return filas
  }

  // Catálogos puros
  if (tieneProveedores) return await r_proveedores(empresa_id, config)
  if (tieneProductos)   return await r_productos(empresa_id, config)
  if (tieneClientes)    return await r_clientes(empresa_id, config)
  return []
}

const r_pagos = async (empresa_id, config) => {
  const where = {
    pedido: { empresa_id },
    ...buildFechaWhere(config, 'creado_en'),
    ...(config.proveedor_id && { proveedor_id: parseInt(config.proveedor_id) }),
    ...(config.estado       && { estado: config.estado }),
  }
  const pagos = await prisma.pago.findMany({
    where,
    include: {
      pedido:    { select: { codigo: true, forma_pago: true } },
      proveedor: { select: { nombre: true } },
    },
    orderBy: { creado_en: 'desc' },
  })

  if (config.modo === 'proveedor') {
    const map = new Map()
    for (const p of pagos) {
      const key = p.proveedor_id
      if (!map.has(key)) {
        map.set(key, {
          proveedor:        p.proveedor?.nombre ?? '—',
          total_pagos:      0,
          monto_total:      0,
          monto_confirmado: 0,
          monto_pendiente:  0,
          moneda:           p.moneda,
        })
      }
      const g = map.get(key)
      g.total_pagos++
      g.monto_total     += Number(p.monto || 0)
      if (p.estado === 'confirmado') g.monto_confirmado += Number(p.monto || 0)
      else                           g.monto_pendiente  += Number(p.monto || 0)
    }
    return [...map.values()]
  }

  return pagos.map(p => ({
    proveedor:    p.proveedor,
    pedido:       p.pedido,
    tipo:         p.tipo,
    monto:        p.monto,
    moneda:       p.moneda,
    estado:       p.estado,
    fecha_pago:   p.fecha_pago,
    fecha_limite: p.fecha_limite,
    metodo:       p.metodo,
    referencia:   p.referencia,
  }))
}

