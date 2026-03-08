// Calcular valor CIF = valor FOB + flete + seguro
export const calcularCIF = ({ valor_fob, flete, seguro }) => {
  return parseFloat((valor_fob + (flete || 0) + (seguro || 0)).toFixed(4))
}

// Calcular arancel = CIF × porcentaje
export const calcularArancel = (valorCIF, pct) => {
  return parseFloat((valorCIF * (pct / 100)).toFixed(4))
}

// Calcular ISC = (CIF + arancel) × porcentaje
export const calcularISC = (valorCIF, arancel, pct) => {
  return parseFloat(((valorCIF + arancel) * (pct / 100)).toFixed(4))
}

// Calcular IVA de referencia (D-150) = (CIF + arancel + ISC) × 13%
export const calcularIVAD150 = (valorCIF, arancel, isc, ivaPct = 13) => {
  return parseFloat(((valorCIF + arancel + isc) * (ivaPct / 100)).toFixed(4))
}

// Calcular costo total en CR = CIF + arancel + ISC + agente + flete_cr + bodega + otros
export const calcularCostoTotalCR = ({
  valor_cif,
  arancel_monto,
  isc_monto,
  agente_aduana,
  flete_cr,
  bodega_costo,
  otros_costos,
}) => {
  return parseFloat((
    (valor_cif      || 0) +
    (arancel_monto  || 0) +
    (isc_monto      || 0) +
    (agente_aduana  || 0) +
    (flete_cr       || 0) +
    (bodega_costo   || 0) +
    (otros_costos   || 0)
  ).toFixed(4))
}

// Distribuir costos logísticos por línea según peso porcentual
// Retorna array con el costo distribuido por línea
export const distribuirCostosPorPeso = (lineas, costoTotal) => {
  const pesoTotalKg = lineas.reduce((acc, l) => acc + parseFloat(l.peso_total_kg || 0), 0)

  return lineas.map(linea => {
    const pesoLinea = parseFloat(linea.peso_total_kg || 0)
    const pct = pesoTotalKg > 0 ? pesoLinea / pesoTotalKg : 1 / lineas.length
    const distribuido = costoTotal * pct
    return {
      linea_id:      linea.linea_id,
      pct_peso:      parseFloat(pct.toFixed(6)),
      dist_logistica: parseFloat(distribuido.toFixed(4)),
    }
  })
}

// Calcular costo unitario CR de una línea
export const calcularCostoUnitCR = (costoOrigenLinea, distribucion, cantidad, tc) => {
  const costoEnCRC = (costoOrigenLinea + distribucion) * tc
  return parseFloat((costoEnCRC / cantidad).toFixed(4))
}

// Calcular precio de venta con margen
export const calcularPrecioVenta = (costoUnitCR, margenPct) => {
  return parseFloat((costoUnitCR / (1 - margenPct / 100)).toFixed(4))
}

// Calcular utilidad bruta
export const calcularUtilidad = (precioVentaTotal, costoTotalLinea) => {
  return parseFloat((precioVentaTotal - costoTotalLinea).toFixed(4))
}
