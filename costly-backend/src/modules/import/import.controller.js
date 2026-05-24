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
    ['sku*', 'nombre*', 'descripcion', 'categoria', 'cod_arancelario', 'arancel_pct', 'peso_kg', 'volumen_m3'],
    ['MTR-001', 'Motor eléctrico', 'Motor 220v 3HP', 'Motores', '8501.10.00', '0', '12.5', '0.025'],
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

    for (const [i, row] of rows.entries()) {
      const sku    = String(row['sku*']    || row['sku']    || '').trim()
      const nombre = String(row['nombre*'] || row['nombre'] || '').trim()

      if (!sku)    { resultados.errores.push(`Fila ${i+2}: SKU requerido`); continue }
      if (!nombre) { resultados.errores.push(`Fila ${i+2}: nombre requerido`); continue }

      const existe = await prisma.producto.findFirst({ where: { sku, empresa_id } })
      if (existe) { resultados.errores.push(`Fila ${i+2}: SKU "${sku}" ya existe`); continue }

      const volumen_m3 = row['volumen_m3'] ? parseFloat(row['volumen_m3']) : null
      await prisma.producto.create({
        data: {
          empresa_id,
          sku,
          nombre,
          descripcion:     String(row['descripcion'] || '').trim() || null,
          categoria:       String(row['categoria'] || '').trim() || null,
          cod_arancelario: String(row['cod_arancelario'] || '').trim() || null,
          arancel_pct:     row['arancel_pct'] ? parseFloat(row['arancel_pct']) : null,
          peso_kg:         row['peso_kg']     ? parseFloat(row['peso_kg'])     : null,
          volumen_m3,
          modo_volumen:    volumen_m3 ? 'unitario' : 'sin_volumen',
        }
      })
      resultados.creados++
    }

    return successResponse(res, resultados, 201)
  } catch (error) { return errorResponse(res, error) }
}
