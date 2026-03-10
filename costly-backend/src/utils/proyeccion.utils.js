// Dimensiones estándar de pallets (en metros)
const PALLETS = {
  pallet_americano: {
    largo: 1.219,
    ancho: 1.016,
    alto_max: 1.80,
    peso_max_kg: 1000,
  },
  pallet_europeo: {
    largo: 1.20,
    ancho: 0.80,
    alto_max: 1.80,
    peso_max_kg: 1500,
  },
}

// Capacidad de contenedores en m³
const CONTENEDORES = {
  LCL:   { max_m3: 15,  label: 'LCL (carga suelta)' },
  GP20:  { max_m3: 25,  label: '20 GP' },
  GP40:  { max_m3: 60,  label: '40 GP' },
  HC40:  { max_m3: 76,  label: '40 HC' },
}

// Calcular volumen de un pallet en m³
const volumenPallet = (tipo, customDims = null) => {
  if (tipo === 'pallet_medida' && customDims) {
    const { largo, ancho, alto_max } = customDims
    return (largo / 100) * (ancho / 100) * (alto_max / 100)
  }
  const p = PALLETS[tipo]
  if (!p) return null
  return p.largo * p.ancho * p.alto_max
}

// Calcular peso máximo de un pallet
const pesoMaxPallet = (tipo, customDims = null) => {
  if (tipo === 'pallet_medida' && customDims) {
    return customDims.peso_max_kg || 1000
  }
  return PALLETS[tipo]?.peso_max_kg || 1000
}

// ── Calcular volumen de una línea según modo_volumen del producto
const calcularVolumenLinea = (producto, cantidad) => {
  const modo = producto.modo_volumen || 'unitario'

  switch (modo) {
    case 'unitario': {
      const volumen = parseFloat(producto.volumen_m3 || 0) * cantidad
      return { volumen, cajas: null, modo }
    }

    case 'por_caja': {
      const unidadesPorCaja = parseInt(producto.unidades_por_caja || 1)
      const cajas           = Math.ceil(cantidad / unidadesPorCaja)
      const volumen         = parseFloat(producto.volumen_caja_m3 || 0) * cajas
      return { volumen, cajas, modo }
    }

    case 'sin_volumen':
    default:
      return { volumen: 0, cajas: null, modo: 'sin_volumen' }
  }
}

// Calcular pallets necesarios para una línea
export const calcularPalletsLinea = (linea, producto) => {
  // Determinar qué configuración usar
  const usarOverride = linea.estiba_override
  const tipoEstiba   = usarOverride ? linea.tipo_estiba_linea : producto.tipo_estiba
  const pesoUnit     = parseFloat(producto.peso_kg || 0)
  const cantidad     = parseFloat(linea.cantidad)

  // Calcular volumen según modo
  const { volumen: volumenTotal, cajas, modo: modoVolumen } = calcularVolumenLinea(producto, cantidad)
  const pesoTotal = pesoUnit * cantidad

  const esEspecial = ['sin_pallet', 'otro'].includes(tipoEstiba)

  let palletsNecesarios = null

  if (!esEspecial) {
    const customDims = usarOverride ? {
      largo:        linea.pallet_largo_cm,
      ancho:        linea.pallet_ancho_cm,
      alto_max:     linea.pallet_alto_max_cm,
      peso_max_kg:  linea.pallet_peso_max_kg,
    } : {
      largo:        producto.pallet_largo_cm,
      ancho:        producto.pallet_ancho_cm,
      alto_max:     producto.pallet_alto_max_cm,
      peso_max_kg:  producto.pallet_peso_max_kg,
    }

    const volPallet  = volumenPallet(tipoEstiba, customDims)
    const pesoMaxPal = pesoMaxPallet(tipoEstiba, customDims)

    if (volPallet && volPallet > 0) {
      const palletsPorVol  = volumenTotal / volPallet
      const palletsPorPeso = pesoTotal    / pesoMaxPal
      palletsNecesarios = Math.max(palletsPorVol, palletsPorPeso)
    }
  }

  return {
    tipo_estiba_usado:  tipoEstiba,
    modo_volumen:       modoVolumen,
    volumen_m3:         volumenTotal,
    peso_kg:            pesoTotal,
    cajas_estimadas:    cajas,
    pallets_necesarios: palletsNecesarios,
    es_especial:        esEspecial,
    nota: usarOverride ? linea.nota_estiba_linea : producto.nota_estiba,
  }
}

// Sugerir tipo de contenedor según volumen total
export const sugerirContenedor = (volumenTotalM3) => {
  if (volumenTotalM3 <= CONTENEDORES.LCL.max_m3)  return { tipo: 'LCL',  cantidad: 1 }
  if (volumenTotalM3 <= CONTENEDORES.GP20.max_m3)  return { tipo: 'GP20', cantidad: 1 }
  if (volumenTotalM3 <= CONTENEDORES.GP40.max_m3)  return { tipo: 'GP40', cantidad: 1 }
  if (volumenTotalM3 <= CONTENEDORES.HC40.max_m3)  return { tipo: 'HC40', cantidad: 1 }

  // Múltiples contenedores HC40
  const cantidad = Math.ceil(volumenTotalM3 / CONTENEDORES.HC40.max_m3)
  return { tipo: 'HC40', cantidad }
}

// Calcular proyección completa de un pedido
export const calcularProyeccion = (lineas, tipoPalletDefault = 'pallet_americano') => {
  let volumenTotal = 0
  let pesoTotal    = 0
  let palletsAmericanos = 0
  let palletsEuropeos   = 0
  let itemsSinPallet    = 0
  let itemsPalletMedida = 0
  let itemsEspeciales   = 0
  let tieneCargaEspecial = false
  const notasEspeciales = []
  const detalle = []

  for (const linea of lineas) {
    const producto = linea.producto
    const resultado = calcularPalletsLinea(linea, producto)

    volumenTotal += resultado.volumen_m3
    pesoTotal    += resultado.peso_kg

    if (resultado.es_especial) {
      tieneCargaEspecial = true
      itemsEspeciales++
      if (resultado.nota) notasEspeciales.push(resultado.nota)
    } else if (resultado.tipo_estiba_usado === 'sin_pallet') {
      itemsSinPallet++
    } else if (resultado.tipo_estiba_usado === 'pallet_medida') {
      itemsPalletMedida++
    }

    // Calcular pallets para sugerencia estándar
    if (resultado.pallets_necesarios) {
      const volPalAm = PALLETS.pallet_americano.largo * PALLETS.pallet_americano.ancho * PALLETS.pallet_americano.alto_max
      const volPalEu = PALLETS.pallet_europeo.largo   * PALLETS.pallet_europeo.ancho   * PALLETS.pallet_europeo.alto_max
      palletsAmericanos += resultado.volumen_m3 / volPalAm
      palletsEuropeos   += resultado.volumen_m3 / volPalEu
    }

    detalle.push({
      linea_id: linea.linea_id,
      ...resultado,
    })
  }

  const contenedor = sugerirContenedor(volumenTotal)

  return {
    tipo_pallet_default:  tipoPalletDefault,
    volumen_total_m3:     parseFloat(volumenTotal.toFixed(4)),
    peso_total_kg:        parseFloat(pesoTotal.toFixed(3)),
    pallets_americanos:   Math.ceil(palletsAmericanos),
    pallets_europeos:     Math.ceil(palletsEuropeos),
    items_sin_pallet:     itemsSinPallet,
    items_pallet_medida:  itemsPalletMedida,
    items_especiales:     itemsEspeciales,
    contenedor_sugerido:  contenedor.tipo,
    contenedores_cant:    contenedor.cantidad,
    tiene_carga_especial: tieneCargaEspecial,
    notas_especiales:     notasEspeciales.join(' | ') || null,
    detalle,
  }
}
