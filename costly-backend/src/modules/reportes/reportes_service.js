import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { parsePagination, buildMeta } from '../../utils/pagination.utils.js'
 
// ── Listar reportes guardados (propios + públicos)
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
 
// ── Generar reporte (ejecutar query y devolver datos)
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
    pagos:    r_pagos,
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
// HANDLERS DE REPORTES PREDEFINIDOS
// ══════════════════════════════════════════════════════════════
 
// R01 — Pedidos activos con semáforo de hitos
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
 
// R02 — Importaciones por estado con totales
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
 
// R03 — Costeos con totales financieros por importación
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
 
// R04 — Pagos pendientes o próximos a vencer
const r04_pagos_pendientes = async (empresa_id, config) => {
  const hoy = new Date()
  const limite = config.dias_limite
    ? new Date(hoy.getTime() + config.dias_limite * 86400000)
    : null
 
  return await prisma.pago.findMany({
    where: {
      pedido: { empresa_id },
      estado: { in: ['programado'] },
      ...(limite && { fecha_limite: { lte: limite } }),
    },
    include: {
      pedido:    { select: { codigo: true } },
      proveedor: { select: { nombre: true } },
    },
    orderBy: { fecha_limite: 'asc' },
  })
}
 
// R05 — Hitos vencidos o próximos a vencer
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
 
// R06 — Proyección de volumen por pedido activo
const r06_proyeccion_volumen = async (empresa_id, config) => {
  return await prisma.proyeccion_volumen.findMany({
    where: {
      pedido: {
        empresa_id,
        estado: { notIn: ['cerrado', 'cancelado'] },
      },
    },
    include: {
      pedido:  { select: { codigo: true, estado: true, proveedor: { select: { nombre: true } } } },
      detalle: { include: { linea_pedido: { include: { producto: { select: { nombre: true, sku: true } } } } } },
    },
    orderBy: { calculado_en: 'desc' },
  })
}
 
// R07 — Productos más pedidos (ranking)
const r07_productos_mas_pedidos = async (empresa_id, config) => {
  const desde = config.desde ? new Date(config.desde) : new Date(Date.now() - 365 * 86400000)
 
  const lineas = await prisma.linea_pedido.groupBy({
    by: ['producto_id'],
    where: {
      pedido: {
        empresa_id,
        creado_en: { gte: desde },
        estado: { not: 'cancelado' },
      }
    },
    _count: { producto_id: true },
    _sum:   { cantidad: true, total_linea: true },
    orderBy: { _count: { producto_id: 'desc' } },
    take: config.top || 20,
  })
 
  // Enriquecer con datos del producto
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
 
// R08 — Proveedores con actividad reciente
const r08_proveedores_activos = async (empresa_id, config) => {
  const desde = config.desde ? new Date(config.desde) : new Date(Date.now() - 365 * 86400000)
 
  return await prisma.proveedor.findMany({
    where: {
      empresa_id,
      activo: true,
      pedidos: { some: { creado_en: { gte: desde } } },
    },
    include: {
      pais: { select: { nombre: true, bandera: true } },
      _count: { select: { pedidos: true } },
    },
    orderBy: { nombre: 'asc' },
  })
}
 
// R09 — Permisos por vencer en los próximos N días
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
 
// R10 — Histórico de tipos de cambio
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
 
// R11 — Utilidad bruta por importación
const r11_utilidad_por_importacion = async (empresa_id, config) => {
  const costeos = await prisma.costeo.findMany({
    where: {
      importacion: { empresa_id },
      estado: 'aprobado',
      ...(config.desde && { creado_en: { gte: new Date(config.desde) } }),
      ...(config.hasta && { creado_en: { lte: new Date(config.hasta) } }),
    },
    include: {
      importacion: { select: { codigo: true, creado_en: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
 
  return costeos.map(c => ({
    importacion:       c.importaciones_rel?.map(r => r.importacion?.codigo).join(' + '),
    fecha:             c.importaciones_rel?.[0]?.importacion?.creado_en,
    costo_origen:      c.costo_origen,
    costo_total_cr:    c.costo_total_cr,
    precio_venta_total:c.precio_venta_total,
    utilidad_bruta:    c.utilidad_bruta,
    margen_global:     c.margen_global,
    tc_usd_crc:        c.tc_usd_crc,
  }))
}
 
// R12 — Documentos por entidad y tipo
const r12_documentos_por_entidad = async (empresa_id, config) => {
  return await prisma.documento.findMany({
    where: {
      empresa_id,
      ...(config.entidad_tipo && { entidad_tipo: config.entidad_tipo }),
      ...(config.tipo_doc     && { tipo_doc: config.tipo_doc }),
    },
    include: {
      subidor: { select: { nombre: true } },
    },
    orderBy: { subido_en: 'desc' },
    take: config.limit || 100,
  })
}
 
// R-DINÁMICO — Filtros libres sobre pedidos
const r_dinamico = async (empresa_id, config) => {
  const where = {
    empresa_id,
    ...(config.estado       && { estado: config.estado }),
    ...(config.proveedor_id && { proveedor_id: config.proveedor_id }),
    ...(config.cliente_id   && { cliente_id: config.cliente_id }),
    ...(config.desde        && { creado_en: { gte: new Date(config.desde) } }),
    ...(config.hasta        && { creado_en: { lte: new Date(config.hasta) } }),
  }
 
  return await prisma.pedido.findMany({
    where,
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
// NUEVOS HANDLERS — fecha_inicio / fecha_fin + columnas
// ══════════════════════════════════════════════════════════════

const buildFechaWhere = (config, campo = 'creado_en') => {
  if (!config.fecha_inicio && !config.fecha_fin) return {}
  const cond = {}
  if (config.fecha_inicio) cond.gte = new Date(config.fecha_inicio + 'T00:00:00.000Z')
  if (config.fecha_fin)    cond.lte = new Date(config.fecha_fin    + 'T23:59:59.999Z')
  return { [campo]: cond }
}

// R-PEDIDOS — todos los campos con rango de fechas
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

// R-IMPORTACIONES — todos los campos con rango de fechas
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

// R-COSTEOS — sección 2 (costos) + sección 3 (desglose por línea)
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
          linea_pedido: {
            include: { producto: { select: { nombre: true, sku: true, categoria: true } } }
          }
        }
      },
      creador:   { select: { nombre: true } },
      aprobador: { select: { nombre: true } },
    },
    orderBy: { creado_en: 'desc' },
  })

  return costeos.map(c => ({
    // Sección 2 — costos de la importación
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
    // Sección 3 — desglose por línea
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

// R-SEGUIMIENTO — hitos por pedido con rango de fechas
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

// R-PROVEEDORES — todos los campos
const r_proveedores = async (empresa_id, config) => {
  return await prisma.proveedor.findMany({
    where: {
      empresa_id,
      ...buildFechaWhere(config),
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

// R-PRODUCTOS — todos los campos
const r_productos = async (empresa_id, config) => {
  return await prisma.producto.findMany({
    where: {
      empresa_id,
      ...buildFechaWhere(config),
      ...(config.activo    !== undefined && { activo:    config.activo }),
      ...(config.categoria && { categoria: config.categoria }),
    },
    orderBy: { nombre: 'asc' },
  })
}

// R-CLIENTES — todos los campos
const r_clientes = async (empresa_id, config) => {
  return await prisma.cliente.findMany({
    where: {
      empresa_id,
      ...buildFechaWhere(config),
      ...(config.tipo   && { tipo:  config.tipo }),
      ...(config.activo !== undefined && { activo: config.activo }),
    },
    orderBy: { nombre: 'asc' },
  })
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

