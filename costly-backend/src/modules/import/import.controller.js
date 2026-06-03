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