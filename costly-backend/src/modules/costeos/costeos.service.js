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

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.costeo.findMany({
    where: {
      importacion: { empresa_id },
      ...(filters.estado && { estado: filters.estado }),
    },
    include: { importacion: { select: { codigo: true } } },
    orderBy: { creado_en: 'desc' },
  })
}

export const getById = async (empresa_id, costeo_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importacion: { empresa_id } },
    include: {
      importacion: true,
      lineas_costeo: { include: { linea_pedido: { include: { producto: true } } } },
      creador: { select: { nombre: true } },
      aprobador: { select: { nombre: true } },
    },
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  return costeo
}

export const create = async (empresa_id, usuario_id, data) => {
  // Verificar que la importación existe
  const importacion = await prisma.importacion.findFirst({
    where: { importacion_id: data.importacion_id, empresa_id },
    include: { pedidos: { include: { lineas: { include: { producto: true } } } } }
  })
  if (!importacion) throw new AppError('Importación no encontrada', 404, 'IMPORTACION_NOT_FOUND')

  // Obtener TC del día
  const tc = data.tc_usd_crc || await getTCHoy(empresa_id)

  // Recopilar todas las líneas de todos los pedidos
  const todasLineas = importacion.pedidos.flatMap(p => p.lineas)

  // Calcular totales
  const costo_origen = todasLineas.reduce((acc, l) => acc + parseFloat(l.total_linea), 0)
  const valor_cif = calcularCIF({ valor_fob: costo_origen, flete: data.flete_maritimo, seguro: data.seguro })
  const arancel_monto = calcularArancel(valor_cif, data.arancel_pct || 0)
  const isc_monto = calcularISC(valor_cif, arancel_monto, data.isc_pct || 0)
  const iva_ref_d150 = calcularIVAD150(valor_cif, arancel_monto, isc_monto)
  const costo_total_cr = calcularCostoTotalCR({
    valor_cif, arancel_monto, isc_monto,
    agente_aduana: data.agente_aduana,
    flete_cr: data.flete_cr,
    bodega_costo: data.bodega_costo,
    otros_costos: data.otros_costos,
  })

  // Distribuir costos por peso
  const lineasConPeso = todasLineas.map(l => ({
    ...l,
    peso_total_kg: parseFloat(l.peso_total_kg || 0)
  }))
  const distribucion = distribuirCostosPorPeso(lineasConPeso, costo_total_cr)

  // Calcular líneas de costeo
  const margen = data.margen_global || 30
  const lineasCosteo = todasLineas.map(linea => {
    const dist = distribucion.find(d => d.linea_id === linea.linea_id)
    const costoUnit = calcularCostoUnitCR(parseFloat(linea.total_linea), dist.dist_logistica, parseFloat(linea.cantidad), tc)
    const precioVentaU = calcularPrecioVenta(costoUnit, margen)
    const precioVentaT = precioVentaU * parseFloat(linea.cantidad)
    const utilidad = calcularUtilidad(precioVentaT, costoUnit * parseFloat(linea.cantidad))

    return {
      linea_id: linea.linea_id,
      pct_peso: dist.pct_peso,
      dist_logistica: dist.dist_logistica,
      costo_unit_cr: costoUnit,
      margen_pct: margen,
      precio_venta_u: precioVentaU,
      precio_venta_t: precioVentaT,
      utilidad,
      ivi_incluido: false,
    }
  })

  const precio_venta_total = lineasCosteo.reduce((acc, l) => acc + l.precio_venta_t, 0)
  const utilidad_bruta = lineasCosteo.reduce((acc, l) => acc + l.utilidad, 0)

  return await prisma.costeo.create({
    data: {
      importacion_id: data.importacion_id,
      creado_por: usuario_id,
      estado: 'borrador',
      flete_maritimo: data.flete_maritimo,
      seguro: data.seguro,
      arancel_pct: data.arancel_pct,
      arancel_monto,
      agente_aduana: data.agente_aduana,
      flete_cr: data.flete_cr,
      isc_pct: data.isc_pct,
      isc_monto,
      bodega_costo: data.bodega_costo,
      otros_costos: data.otros_costos,
      tc_usd_crc: tc,
      costo_origen,
      valor_cif,
      costo_total_cr,
      iva_ref_d150,
      margen_global: margen,
      precio_venta_total,
      utilidad_bruta,
      lineas_costeo: { create: lineasCosteo },
    },
    include: { lineas_costeo: true },
  })
}

export const update = async (empresa_id, costeo_id, data) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importacion: { empresa_id } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado !== 'borrador') throw new AppError('Solo se puede editar un costeo en borrador', 400, 'COSTEO_LOCKED')

  return await prisma.costeo.update({ where: { costeo_id }, data })
}

export const aprobar = async (empresa_id, costeo_id, usuario_id) => {
  const costeo = await prisma.costeo.findFirst({
    where: { costeo_id, importacion: { empresa_id } }
  })
  if (!costeo) throw new AppError('Costeo no encontrado', 404, 'COSTEO_NOT_FOUND')
  if (costeo.estado === 'aprobado') throw new AppError('El costeo ya está aprobado', 400, 'COSTEO_YA_APROBADO')

  return await prisma.costeo.update({
    where: { costeo_id },
    data: { estado: 'aprobado', aprobado_por: usuario_id, aprobado_en: new Date() }
  })
}