// ============================================================
// src/modules/import/import.controller.js
// ============================================================
import * as XLSX   from 'xlsx'
import prisma      from '../../config/database.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

const parseExcel = (buffer) => {
  const wb   = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// ── Descargar plantilla
export const plantillaProveedores = (req, res) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['nombre*', 'ciudad', 'moneda*', 'incoterm_pref', 'dias_transito', 'puerto_origen', 'condiciones_pago'],
    ['Proveedor Ejemplo', 'Shanghai', 'USD', 'FOB', '30', 'Shanghai Port', '30% adelanto'],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Proveedores')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_proveedores.xlsx')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
}

export const plantillaClientes = (req, res) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['nombre*', 'cedula', 'tipo*', 'moneda*', 'descuento_pct', 'email'],
    ['Cliente Ejemplo', '3-101-123456', 'nacional', 'CRC', '0', 'cliente@empresa.com'],
    ['', '', '// tipo: nacional | exportacion | interno', '', '', ''],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_clientes.xlsx')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
}

export const plantillaProductos = (req, res) => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    [
      'sku*', 'nombre*', 'descripcion', 'categoria', 'cod_arancelario',
      'arancel_pct', 'peso_kg', 'modo_volumen',
      // Unitario
      'largo_cm', 'ancho_cm', 'alto_cm', 'volumen_m3',
      // Por caja
      'unidades_por_caja', 'peso_caja_kg',
      'largo_caja_cm', 'ancho_caja_cm', 'alto_caja_cm', 'volumen_caja_m3',
      // Permisos
      'requiere_permiso', 'permiso_tipo',
    ],
    [
      'MTR-001', 'Motor eléctrico', 'Motor 220v 3HP', 'Motores', '8501.10.00',
      '0', '12.5', 'unitario',
      '30', '20', '25', '',
      '', '',
      '', '', '', '',
      'false', '',
    ],
    [
      'CJA-001', 'Filtro de aceite', 'Filtro HF-200', 'Filtros', '8421.23.00',
      '5', '0.3', 'por_caja',
      '', '', '', '',
      '12', '4.5',
      '40', '30', '25', '',
      'false', '',
    ],
    [
      '', '', '// modo_volumen: unitario | por_caja | sin_volumen', '', '',
      '', '', '',
      '// Si modo=unitario: largo/ancho/alto calculan volumen_m3', '', '', '',
      '// Si modo=por_caja: largo/ancho/alto_caja calculan volumen_caja_m3', '',
      '', '', '', '',
      '// requiere_permiso: true | false', '// permiso_tipo: minae|senasa|minsa|sutel|otro',
    ],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos.xlsx')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
}

// ── Importar proveedores
export const importarProveedores = async (req, res) => {
  try {
    const rows = parseExcel(req.file.buffer)
    const empresa_id = req.user.empresa_id

    // Obtener pais_id por defecto (China)
    const paisDefault = await prisma.pais.findFirst({
      where: { OR: [{ codigo: 'CN' }, { nombre: { contains: 'China' } }] }
    })
    const paisCR = await prisma.pais.findFirst({
      where: { OR: [{ codigo: 'CR' }, { nombre: { contains: 'Costa Rica' } }] }
    })

    const resultados = { creados: 0, errores: [] }

    for (const [i, row] of rows.entries()) {
      const nombre = String(row['nombre*'] || row['nombre'] || '').trim()
      const moneda = String(row['moneda*'] || row['moneda'] || 'USD').trim()

      if (!nombre) { resultados.errores.push(`Fila ${i+2}: nombre requerido`); continue }
      if (!moneda) { resultados.errores.push(`Fila ${i+2}: moneda requerida`); continue }

      const existe = await prisma.proveedor.findFirst({ where: { nombre, empresa_id } })
      if (existe) { resultados.errores.push(`Fila ${i+2}: "${nombre}" ya existe`); continue }

      await prisma.proveedor.create({
        data: {
          empresa_id,
          pais_id:          paisDefault?.pais_id || 1,
          nombre,
          ciudad:           String(row['ciudad'] || '').trim() || null,
          moneda,
          incoterm_pref:    String(row['incoterm_pref'] || '').trim() || null,
          dias_transito:    row['dias_transito'] ? parseInt(row['dias_transito']) : null,
          puerto_origen:    String(row['puerto_origen'] || '').trim() || null,
          condiciones_pago: String(row['condiciones_pago'] || '').trim() || null,
        }
      })
      resultados.creados++
    }

    return successResponse(res, resultados, 201)
  } catch (error) { return errorResponse(res, error) }
}

// ── Importar clientes
export const importarClientes = async (req, res) => {
  try {
    const rows = parseExcel(req.file.buffer)
    const empresa_id = req.user.empresa_id
    const resultados = { creados: 0, errores: [] }
    const TIPOS_VALIDOS = ['nacional', 'exportacion', 'interno']

    for (const [i, row] of rows.entries()) {
      const nombre = String(row['nombre*'] || row['nombre'] || '').trim()
      const tipo   = String(row['tipo*']   || row['tipo']   || '').trim().toLowerCase()
      const moneda = String(row['moneda*'] || row['moneda'] || 'CRC').trim()

      if (!nombre) { resultados.errores.push(`Fila ${i+2}: nombre requerido`); continue }
      if (!TIPOS_VALIDOS.includes(tipo)) { resultados.errores.push(`Fila ${i+2}: tipo inválido "${tipo}"`); continue }

      const existe = await prisma.cliente.findFirst({ where: { nombre, empresa_id } })
      if (existe) { resultados.errores.push(`Fila ${i+2}: "${nombre}" ya existe`); continue }

      await prisma.cliente.create({
        data: {
          empresa_id,
          nombre,
          tipo,
          moneda,
          cedula:        String(row['cedula'] || '').trim() || null,
          descuento_pct: row['descuento_pct'] ? parseFloat(row['descuento_pct']) : null,
          email:         String(row['email'] || '').trim() || null,
        }
      })
      resultados.creados++
    }

    return successResponse(res, resultados, 201)
  } catch (error) { return errorResponse(res, error) }
}

// ── Importar productos
export const importarProductos = async (req, res) => {
  try {
    const rows = parseExcel(req.file.buffer)
    const empresa_id = req.user.empresa_id
    const resultados = { creados: 0, errores: [] }
    const MODOS_VALIDOS = ['unitario', 'por_caja', 'sin_volumen']
    const PERMISOS_VALIDOS = ['minae', 'senasa', 'minsa', 'sutel', 'otro']
 
    for (const [i, row] of rows.entries()) {
      const sku    = String(row['sku*']    || row['sku']    || '').trim()
      const nombre = String(row['nombre*'] || row['nombre'] || '').trim()
 
      if (!sku)    { resultados.errores.push(`Fila ${i+2}: SKU requerido`); continue }
      if (!nombre) { resultados.errores.push(`Fila ${i+2}: nombre requerido`); continue }
 
      const existe = await prisma.producto.findFirst({ where: { sku, empresa_id } })
      if (existe) { resultados.errores.push(`Fila ${i+2}: SKU "${sku}" ya existe`); continue }
 
      // Modo volumen
      const modo_volumen_raw = String(row['modo_volumen'] || '').trim().toLowerCase()
      const modo_volumen = MODOS_VALIDOS.includes(modo_volumen_raw) ? modo_volumen_raw : null
 
      // Dimensiones unitario
      const largo_cm = row['largo_cm'] ? parseFloat(row['largo_cm']) : null
      const ancho_cm = row['ancho_cm'] ? parseFloat(row['ancho_cm']) : null
      const alto_cm  = row['alto_cm']  ? parseFloat(row['alto_cm'])  : null
      const volumen_m3_calculado = (largo_cm && ancho_cm && alto_cm)
        ? parseFloat(((largo_cm * ancho_cm * alto_cm) / 1_000_000).toFixed(6))
        : null
      const volumen_m3 = volumen_m3_calculado
        || (row['volumen_m3'] ? parseFloat(row['volumen_m3']) : null)
 
      // Dimensiones caja
      const largo_caja_cm = row['largo_caja_cm'] ? parseFloat(row['largo_caja_cm']) : null
      const ancho_caja_cm = row['ancho_caja_cm'] ? parseFloat(row['ancho_caja_cm']) : null
      const alto_caja_cm  = row['alto_caja_cm']  ? parseFloat(row['alto_caja_cm'])  : null
      const volumen_caja_calculado = (largo_caja_cm && ancho_caja_cm && alto_caja_cm)
        ? parseFloat(((largo_caja_cm * ancho_caja_cm * alto_caja_cm) / 1_000_000).toFixed(6))
        : null
      const volumen_caja_m3 = volumen_caja_calculado
        || (row['volumen_caja_m3'] ? parseFloat(row['volumen_caja_m3']) : null)
 
      // Modo inferido si no viene
      const modo_final = modo_volumen
        || (volumen_caja_m3 ? 'por_caja' : volumen_m3 ? 'unitario' : 'sin_volumen')
 
      // Permisos
      const requiere_permiso = String(row['requiere_permiso'] || '').trim().toLowerCase() === 'true'
      const permiso_tipo_raw = String(row['permiso_tipo'] || '').trim().toLowerCase()
      const permiso_tipo = PERMISOS_VALIDOS.includes(permiso_tipo_raw) ? permiso_tipo_raw : null
 
      await prisma.producto.create({
        data: {
          empresa_id,
          sku,
          nombre,
          descripcion:       String(row['descripcion'] || '').trim() || null,
          categoria:         String(row['categoria'] || '').trim() || null,
          cod_arancelario:   String(row['cod_arancelario'] || '').trim() || null,
          arancel_pct:       row['arancel_pct'] ? parseFloat(row['arancel_pct']) : null,
          peso_kg:           row['peso_kg']     ? parseFloat(row['peso_kg'])     : null,
          modo_volumen:      modo_final,
          largo_cm,
          ancho_cm,
          alto_cm,
          volumen_m3:        modo_final === 'unitario' ? volumen_m3 : null,
          unidades_por_caja: row['unidades_por_caja'] ? parseInt(row['unidades_por_caja']) : null,
          peso_caja_kg:      row['peso_caja_kg']      ? parseFloat(row['peso_caja_kg'])    : null,
          largo_caja_cm,
          ancho_caja_cm,
          alto_caja_cm,
          volumen_caja_m3:   modo_final === 'por_caja' ? volumen_caja_m3 : null,
          requiere_permiso,
          permiso_tipo:      requiere_permiso ? permiso_tipo : null,
        }
      })
      resultados.creados++
    }
 
    return successResponse(res, resultados, 201)
  } catch (error) { return errorResponse(res, error) }
  
}

// ── Plantilla pedidos
export const plantillaPedidos = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id

    const [proveedores, productos, clientes] = await Promise.all([
      prisma.proveedor.findMany({ where: { empresa_id, activo: true }, select: { proveedor_id: true, nombre: true }, take: 5 }),
      prisma.producto.findMany({  where: { empresa_id, activo: true }, select: { producto_id: true, sku: true, nombre: true }, take: 5 }),
      prisma.cliente.findMany({   where: { empresa_id, activo: true }, select: { cliente_id: true, nombre: true }, take: 5 }),
    ])

    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['proveedor_id*', 'cliente_id', 'fecha_pedido*', 'incoterm*', 'moneda*', 'forma_pago', 'nota'],
      [proveedores[0]?.proveedor_id || 1, clientes[0]?.cliente_id || '', new Date().toISOString().split('T')[0], 'FOB', 'USD', 'contado', 'Pedido de ejemplo'],
      ['', '', '// fecha: YYYY-MM-DD', '// EXW|FOB|CIF|DAP|DDP|CFR', '// USD|EUR|CNY|CRC', '// contado|30|60|90|180|365', ''],
    ]), 'Pedidos')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['fila_pedido*', 'producto_id*', 'cantidad*', 'precio_unit*', 'nota'],
      [2, productos[0]?.producto_id || 1, 100, 12.50, 'Línea de ejemplo'],
      [2, productos[1]?.producto_id || 2, 50,  8.00,  ''],
      ['// fila_pedido = fila del pedido en hoja Pedidos (empieza en 2)', '', '', '', ''],
    ]), 'Lineas')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['proveedor_id', 'nombre'],
      ...proveedores.map(p => [p.proveedor_id, p.nombre]),
    ]), 'Ref_Proveedores')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['producto_id', 'sku', 'nombre'],
      ...productos.map(p => [p.producto_id, p.sku, p.nombre]),
    ]), 'Ref_Productos')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['cliente_id', 'nombre'],
      ...clientes.map(c => [c.cliente_id, c.nombre]),
    ]), 'Ref_Clientes')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_pedidos.xlsx')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)
  } catch (error) { return errorResponse(res, error) }
}

// ── Importar pedidos
export const importarPedidos = async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const wsPed = wb.Sheets['Pedidos']
    const wsLin = wb.Sheets['Lineas']
    if (!wsPed) return errorResponse(res, { message: 'Falta la hoja "Pedidos"', status: 400 })
    if (!wsLin) return errorResponse(res, { message: 'Falta la hoja "Lineas"', status: 400 })

    const rowsPed = XLSX.utils.sheet_to_json(wsPed, { defval: '' })
    const rowsLin = XLSX.utils.sheet_to_json(wsLin, { defval: '' })
    const empresa_id = req.user.empresa_id
    const usuario_id = req.user.usuario_id
    const resultados = { creados: 0, errores: [] }

    const INCOTERMS   = ['EXW','FOB','CIF','DAP','DDP','CFR']
    const MONEDAS     = ['USD','EUR','CNY','CRC']
    const FORMAS_PAGO = ['contado','30','60','90','180','365']

    const [proveedores, productos, clientes] = await Promise.all([
      prisma.proveedor.findMany({ where: { empresa_id, activo: true }, select: { proveedor_id: true } }),
      prisma.producto.findMany({  where: { empresa_id, activo: true }, select: { producto_id: true } }),
      prisma.cliente.findMany({   where: { empresa_id, activo: true }, select: { cliente_id: true } }),
    ])
    const provIds = new Set(proveedores.map(p => p.proveedor_id))
    const prodIds = new Set(productos.map(p => p.producto_id))
    const cliIds  = new Set(clientes.map(c => c.cliente_id))

    // Agrupar líneas por fila_pedido
    const lineasPorFila = {}
    for (const [j, lin] of rowsLin.entries()) {
      const fila = String(lin['fila_pedido*'] || lin['fila_pedido'] || '').trim()
      if (!fila || fila.startsWith('//')) continue
      if (!lineasPorFila[fila]) lineasPorFila[fila] = []
      lineasPorFila[fila].push({ lin, j })
    }

    for (const [i, row] of rowsPed.entries()) {
      const filaNum = String(i + 2)
      if (String(row['proveedor_id*'] || '').startsWith('//')) continue

      const proveedor_id = parseInt(row['proveedor_id*'] || row['proveedor_id'])
      const fecha_str    = String(row['fecha_pedido*'] || row['fecha_pedido'] || '').trim()
      const incoterm     = String(row['incoterm*'] || row['incoterm'] || '').trim().toUpperCase()
      const moneda       = String(row['moneda*']   || row['moneda']   || '').trim().toUpperCase()
      const forma_pago   = String(row['forma_pago'] || 'contado').trim()

      if (!proveedor_id || isNaN(proveedor_id)) { resultados.errores.push(`Fila ${filaNum}: proveedor_id requerido`); continue }
      if (!provIds.has(proveedor_id))            { resultados.errores.push(`Fila ${filaNum}: proveedor_id ${proveedor_id} no existe`); continue }
      if (!fecha_str)                            { resultados.errores.push(`Fila ${filaNum}: fecha_pedido requerida`); continue }

      const fecha_pedido = new Date(fecha_str)
      if (isNaN(fecha_pedido.getTime()))         { resultados.errores.push(`Fila ${filaNum}: fecha inválida "${fecha_str}"`); continue }
      if (!INCOTERMS.includes(incoterm))         { resultados.errores.push(`Fila ${filaNum}: incoterm inválido "${incoterm}"`); continue }
      if (!MONEDAS.includes(moneda))             { resultados.errores.push(`Fila ${filaNum}: moneda inválida "${moneda}"`); continue }
      if (!FORMAS_PAGO.includes(forma_pago))     { resultados.errores.push(`Fila ${filaNum}: forma_pago inválida "${forma_pago}"`); continue }

      const cliente_id_raw = row['cliente_id'] ? parseInt(row['cliente_id']) : null
      if (cliente_id_raw && !cliIds.has(cliente_id_raw)) { resultados.errores.push(`Fila ${filaNum}: cliente_id ${cliente_id_raw} no existe`); continue }

      const lineasFila = lineasPorFila[filaNum] || []
      if (!lineasFila.length) { resultados.errores.push(`Fila ${filaNum}: sin líneas en hoja Lineas`); continue }

      const lineasValidas = []
      let ok = true
      for (const { lin, j } of lineasFila) {
        const producto_id = parseInt(lin['producto_id*'] || lin['producto_id'])
        const cantidad    = parseFloat(lin['cantidad*']   || lin['cantidad'])
        const precio_unit = parseFloat(lin['precio_unit*'] || lin['precio_unit'])

        if (!producto_id || isNaN(producto_id))    { resultados.errores.push(`Lineas fila ${j+2}: producto_id requerido`); ok = false; break }
        if (!prodIds.has(producto_id))             { resultados.errores.push(`Lineas fila ${j+2}: producto_id ${producto_id} no existe`); ok = false; break }
        if (!cantidad || cantidad <= 0)            { resultados.errores.push(`Lineas fila ${j+2}: cantidad inválida`); ok = false; break }
        if (!precio_unit || precio_unit <= 0)      { resultados.errores.push(`Lineas fila ${j+2}: precio_unit inválido`); ok = false; break }

        lineasValidas.push({
          producto_id, cantidad, precio_unit,
          total_linea: cantidad * precio_unit,
          nota: String(lin['nota'] || '').trim() || null,
        })
      }
      if (!ok) continue

      const year   = fecha_pedido.getFullYear()
      const count  = await prisma.pedido.count({ where: { empresa_id } })
      const codigo = `PED-${year}-${String(count + 1).padStart(3, '0')}`

      await prisma.pedido.create({
        data: {
          empresa_id, proveedor_id,
          cliente_id: cliente_id_raw || null,
          creado_por: usuario_id,
          codigo, fecha_pedido, incoterm, moneda, forma_pago,
          nota:   String(row['nota'] || '').trim() || null,
          estado: 'borrador',
          lineas: {
            create: lineasValidas.map((l, idx) => ({
              numero: idx + 1, producto_id: l.producto_id,
              cantidad: l.cantidad, precio_unit: l.precio_unit,
              total_linea: l.total_linea, nota: l.nota,
            }))
          }
        }
      })
      resultados.creados++
    }

    return successResponse(res, resultados, 201)
  } catch (error) { return errorResponse(res, error) }
}