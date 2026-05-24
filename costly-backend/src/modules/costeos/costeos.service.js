// ============================================================
// src/modules/costeos/costeos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import {
  calcularCIF, calcularArancel, calcularISC, calcularIVAD150,
  calcularCostoTotalCR, distribuirCostosPorPeso,
  calcularCostoUnitCR, calcularPrecioVenta, calcularUtilidad
} from '../../utils/costeo.utils.js'
import { getTCHoy } from '../../utils/moneda.utils.js'

// ── Include reutilizable
const INCLUDE_COSTEO = {
  importaciones_rel: {
    include: { importacion: { select: { codigo: true, estado: true } } }
  },
  lineas_costeo: { include: { linea_pedido: { include: { producto: true } } } },
  creador:  { select: { nombre: true } },
  aprobador:{ select: { nombre: true } },
}

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.costeo.findMany({
    where: {
      importaciones_rel: { some: { importacion: { empresa_id } } },
      ...(filters.estado && { estado: filters.estado }),
    },
    include: {
      importaciones_rel: {
        include: { importacion: { select: { codigo: true, estado: true } } }
      },
    },
    orderBy: { creado_en: 'desc' },
  })
}

export const getById = async (empresa_id, costeo_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: {
      costeo_id,
      importaciones_rel: { some: { importacion: { empresa_id } } },
    },
    include: INCLUDE_COSTEO,
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  return costeo
}

export const create = async (empresa_id, usuario_id, data) => {
  const importacion_ids = data.importacion_ids || [data.importacion_id]

  // Verificar que todas las importaciones existen y pertenecen a la empresa
  const importaciones = await prisma.importacion.findMany({
    where: { importacion_id: { in: importacion_ids }, empresa_id },
    include: { pedidos: { include: { lineas: { include: { producto: true } } } } }
  })
  if (importaciones.length !== importacion_ids.length)
    throw new AppError('Una o más importaciones no encontradas', 404, 'IMPORTACION_NOT_FOUND')

  // Obtener TC del día
  const tc = data.tc_usd_crc || await getTCHoy(empresa_id)

  // Recopilar todas las líneas de todos los pedidos de todas las importaciones
  const todasLineas = importaciones.flatMap(imp =>
    imp.pedidos.flatMap(p => p.lineas)
  )
  if (!todasLineas.length)
    throw new AppError('Las importaciones no tienen líneas de pedido', 400, 'SIN_LINEAS')

  // Calcular totales
  const costo_origen  = todasLineas.reduce((acc, l) => acc + parseFloat(l.total_linea), 0)
  const valor_cif     = calcularCIF({ valor_fob: costo_origen, flete: data.flete_maritimo, seguro: data.seguro })
  const arancel_monto = calcularArancel(valor_cif, data.arancel_pct || 0)
  const isc_monto     = calcularISC(valor_cif, arancel_monto, data.isc_pct || 0)
  const iva_ref_d150  = calcularIVAD150(valor_cif, arancel_monto, isc_monto)
  const costo_total_cr = calcularCostoTotalCR({
    valor_cif, arancel_monto, isc_monto,
    agente_aduana: data.agente_aduana,
    flete_cr:      data.flete_cr,
    bodega_costo:  data.bodega_costo,
    otros_costos:  data.otros_costos,
  })

  // Distribuir costos por peso
  const lineasConPeso  = todasLineas.map(l => ({ ...l, peso_total_kg: parseFloat(l.peso_total_kg || 0) }))
  const distribucion   = distribuirCostosPorPeso(lineasConPeso, costo_total_cr)
  const margen         = data.margen_global || 30

  const lineasCosteo = todasLineas.map(linea => {
    const dist        = distribucion.find(d => d.linea_id === linea.linea_id)
    const costoUnit   = calcularCostoUnitCR(parseFloat(linea.total_linea), dist.dist_logistica, parseFloat(linea.cantidad), tc)
    const precioVentaU = calcularPrecioVenta(costoUnit, margen)
    const precioVentaT = precioVentaU * parseFloat(linea.cantidad)
    const utilidad     = calcularUtilidad(precioVentaT, costoUnit * parseFloat(linea.cantidad))
    return {
      linea_id:       linea.linea_id,
      pct_peso:       dist.pct_peso,
      dist_logistica: dist.dist_logistica,
      costo_unit_cr:  costoUnit,
      margen_pct:     margen,
      precio_venta_u: precioVentaU,
      precio_venta_t: precioVentaT,
      utilidad,
      ivi_incluido:   false,
    }
  })

  const precio_venta_total = lineasCosteo.reduce((acc, l) => acc + l.precio_venta_t, 0)
  const utilidad_bruta     = lineasCosteo.reduce((acc, l) => acc + l.utilidad, 0)

  return await prisma.costeo.create({
    data: {
      creado_por:    usuario_id,
      estado:        'borrador',
      flete_maritimo: data.flete_maritimo,
      seguro:         data.seguro,
      arancel_pct:    data.arancel_pct,
      arancel_monto,
      agente_aduana:  data.agente_aduana,
      flete_cr:       data.flete_cr,
      isc_pct:        data.isc_pct,
      isc_monto,
      bodega_costo:   data.bodega_costo,
      otros_costos:   data.otros_costos,
      tc_usd_crc:     tc,
      costo_origen,
      valor_cif,
      costo_total_cr,
      iva_ref_d150,
      margen_global:      margen,
      precio_venta_total,
      utilidad_bruta,
      // Crear relaciones con las importaciones
      importaciones_rel: {
        create: importacion_ids.map(importacion_id => ({ importacion_id }))
      },
      lineas_costeo: { create: lineasCosteo },
    },
    include: INCLUDE_COSTEO,
  })
}

export const update = async (empresa_id, costeo_id, data) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado !== 'borrador')
    throw new AppError('Solo se puede editar un costeo en borrador', 400, 'COSTEO_LOCKED')

  const { importacion_ids, importacion_id, ...updateData } = data

  // Si viene lista de importaciones nueva, sincronizarla
  if (importacion_ids?.length) {
    await prisma.costeo_importacion.deleteMany({ where: { costeo_id } })
    await prisma.costeo_importacion.createMany({
      data: importacion_ids.map(id => ({ costeo_id, importacion_id: id }))
    })
  }

  return await prisma.costeo.update({ where: { costeo_id }, data: updateData })
}

export const aprobar = async (empresa_id, costeo_id, usuario_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado === 'aprobado')
    throw new AppError('El costeo ya está aprobado', 400, 'COSTEO_YA_APROBADO')

  return await prisma.costeo.update({
    where: { costeo_id },
    data: { estado: 'aprobado', aprobado_por: usuario_id, aprobado_en: new Date() }
  })
}

// ── Eliminar costeo
export const remove = async (empresa_id, costeo_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado === 'aprobado')
    throw new AppError('No se puede eliminar un costeo aprobado', 400, 'COSTEO_APROBADO')

  await prisma.$transaction(async (tx) => {
    await tx.linea_costeo.deleteMany({ where: { costeo_id } })
    await tx.costeo_importacion.deleteMany({ where: { costeo_id } })
    await tx.costeo_detalle.deleteMany({ where: { costeo_id } }).catch(() => {})
    await tx.costeo.delete({ where: { costeo_id } })
  })
  return { ok: true }
}

// ── Agregar importación a costeo existente
export const addImportacion = async (empresa_id, costeo_id, importacion_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado !== 'borrador')
    throw new AppError('Solo se puede modificar un costeo en borrador', 400, 'COSTEO_LOCKED')

  const importacion = await prisma.importacion.findFirst({ where: { importacion_id, empresa_id } })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')

  return await prisma.costeo_importacion.create({ data: { costeo_id, importacion_id } })
}

// ── Quitar importación de costeo existente
export const removeImportacion = async (empresa_id, costeo_id, importacion_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } },
    include: { importaciones_rel: true }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado !== 'borrador')
    throw new AppError('Solo se puede modificar un costeo en borrador', 400, 'COSTEO_LOCKED')
  if (costeo.importaciones_rel.length <= 1)
    throw new AppError('El costeo debe tener al menos una importación', 400, 'MIN_IMPORTACIONES')

  return await prisma.costeo_importacion.deleteMany({ where: { costeo_id, importacion_id } })
}

// ── Crear aproximación de costeo (basada en pedidos directos)
export const createAproximacion = async (empresa_id, usuario_id, data) => {
  const pedido_ids = data.pedido_ids || []
  if (!pedido_ids.length)
    throw new AppError('Se requiere al menos un pedido', 400, 'SIN_PEDIDOS')

  const pedidos = await prisma.pedido.findMany({
    where: { pedido_id: { in: pedido_ids }, empresa_id },
    include: { lineas: { include: { producto: true } } }
  })
  if (pedidos.length !== pedido_ids.length)
    throw new AppError('Uno o más pedidos no encontrados', 404, 'PEDIDO_NOT_FOUND')

  const tc          = data.tc_usd_crc || await getTCHoy(empresa_id)
  const todasLineas = pedidos.flatMap(p => p.lineas)
  if (!todasLineas.length)
    throw new AppError('Los pedidos no tienen líneas', 400, 'SIN_LINEAS')

  const costo_origen = todasLineas.reduce((acc, l) => acc + parseFloat(l.total_linea), 0)

  // Calcular costos — cada campo puede ser % sobre FOB o monto fijo
  const resolveMonto = (valor, esPct) => esPct ? (costo_origen * parseFloat(valor || 0)) / 100 : parseFloat(valor || 0)

  const flete_monto    = resolveMonto(data.flete_maritimo,  data.flete_es_pct)
  const seguro_monto   = resolveMonto(data.seguro,          data.seguro_es_pct)
  const agente_monto   = resolveMonto(data.agente_aduana,   data.agente_es_pct)
  const flete_cr_monto = resolveMonto(data.flete_cr,        data.flete_cr_es_pct)
  const bodega_monto   = resolveMonto(data.bodega_costo,    data.bodega_es_pct)
  const otros_monto    = resolveMonto(data.otros_costos,    data.otros_es_pct)

  const valor_cif      = calcularCIF({ valor_fob: costo_origen, flete: flete_monto, seguro: seguro_monto })
  const arancel_monto  = calcularArancel(valor_cif, data.arancel_pct || 0)
  const isc_monto      = calcularISC(valor_cif, arancel_monto, data.isc_pct || 0)
  const iva_ref_d150   = calcularIVAD150(valor_cif, arancel_monto, isc_monto)
  const costo_total_cr = calcularCostoTotalCR({
    valor_cif, arancel_monto, isc_monto,
    agente_aduana: agente_monto,
    flete_cr:      flete_cr_monto,
    bodega_costo:  bodega_monto,
    otros_costos:  otros_monto,
  })

  const lineasConPeso  = todasLineas.map(l => ({ ...l, peso_total_kg: parseFloat(l.peso_total_kg || 0) }))
  const distribucion   = distribuirCostosPorPeso(lineasConPeso, costo_total_cr)
  const margen         = data.margen_global || 30

  const lineasCosteo = todasLineas.map(linea => {
    const dist         = distribucion.find(d => d.linea_id === linea.linea_id)
    const costoUnit    = calcularCostoUnitCR(parseFloat(linea.total_linea), dist.dist_logistica, parseFloat(linea.cantidad), tc)
    const precioVentaU = calcularPrecioVenta(costoUnit, margen)
    const precioVentaT = precioVentaU * parseFloat(linea.cantidad)
    const utilidad     = calcularUtilidad(precioVentaT, costoUnit * parseFloat(linea.cantidad))
    return {
      linea_id: linea.linea_id, pct_peso: dist.pct_peso,
      dist_logistica: dist.dist_logistica, costo_unit_cr: costoUnit,
      margen_pct: margen, precio_venta_u: precioVentaU,
      precio_venta_t: precioVentaT, utilidad, ivi_incluido: false,
    }
  })

  const precio_venta_total = lineasCosteo.reduce((acc, l) => acc + l.precio_venta_t, 0)
  const utilidad_bruta     = lineasCosteo.reduce((acc, l) => acc + l.utilidad, 0)

  return await prisma.costeo.create({
    data: {
      tipo:          'aproximacion',
      creado_por:    usuario_id,
      estado:        'borrador',
      flete_maritimo: flete_monto,
      seguro:         seguro_monto,
      arancel_pct:    data.arancel_pct,
      arancel_monto,
      agente_aduana:  agente_monto,
      flete_cr:       flete_cr_monto,
      isc_pct:        data.isc_pct,
      isc_monto,
      bodega_costo:   bodega_monto,
      otros_costos:   otros_monto,
      tc_usd_crc:     tc,
      costo_origen,
      valor_cif,
      costo_total_cr,
      iva_ref_d150,
      margen_global:      margen,
      precio_venta_total,
      utilidad_bruta,
      pedidos_rel: { create: pedido_ids.map(pedido_id => ({ pedido_id })) },
      lineas_costeo: { create: lineasCosteo },
    },
    include: {
      pedidos_rel: { include: { pedido: { select: { codigo: true } } } },
      lineas_costeo: true,
    },
  })
}

// ── Guardar notas por campo del costeo
export const saveDetalles = async (empresa_id, costeo_id, detalles) => {
  if (!detalles?.length) return { ok: true }
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  for (const d of detalles) {
    if (!d.campo) continue
    await prisma.costeo_detalle.upsert({
      where:  { costeo_id_campo: { costeo_id, campo: d.campo } },
      update: { nota: d.nota || null },
      create: { costeo_id, campo: d.campo, nota: d.nota || null },
    })
  }
  return { ok: true }
}

// ── Guardar archivo de un campo del costeo
export const saveArchivo = async (empresa_id, usuario_id, costeo_id, campo, file) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importaciones_rel: { some: { importacion: { empresa_id } } } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  return await prisma.documento.create({
    data: {
      empresa_id,
      subido_por:   usuario_id,
      entidad_tipo: 'costeo',
      entidad_id:   costeo_id,
      campo:        campo || 'otros_archivos',
      tipo_doc:     'otro',
      nombre:       file.originalname,
      url:          `/uploads/costeos/${file.filename}`,
      tamanio_kb:   Math.round(file.size / 1024),
      mime_type:    file.mimetype,
    }
  })
}

// ── Obtener notas y archivos de un costeo
export const getDetalles = async (empresa_id, costeo_id) => {
  const notas = await prisma.costeo_detalle.findMany({
    where: { costeo_id }, orderBy: { campo: 'asc' },
  })
  const archivos = await prisma.documento.findMany({
    where: { entidad_tipo: 'costeo', entidad_id: costeo_id },
    orderBy: { subido_en: 'desc' },
  })
  return { notas, archivos }
}

// ── Eliminar archivo del costeo
export const deleteArchivo = async (empresa_id, costeo_id, doc_id) => {
  const doc = await prisma.documento.findFirst({
    where: { doc_id, entidad_tipo: 'costeo', entidad_id: costeo_id }
  })
  if (!doc) throw new AppError('Archivo no encontrado', 404, 'DOC_NOT_FOUND')
  const { default: fs }   = await import('fs')
  const { default: path } = await import('path')
  const filePath = path.join(process.cwd(), 'public', doc.url)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  await prisma.documento.delete({ where: { doc_id } })
  return { ok: true }
}
