// ============================================================
// src/hooks/useExport.js
// ============================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import api from '../lib/api'

// ── Obtener pedido completo desde el backend
const fetchPedido = async (id) => {
  const res = await api.get(`/pedidos/${id}`)
  return res?.data ?? res
}

// ── Obtener empresa
const fetchEmpresa = async () => {
  const res = await api.get('/empresa')
  return res?.data ?? res
}

// ── Exportar PDF
export const exportarPDF = async (pedidoId) => {
  const [p, empresa] = await Promise.all([fetchPedido(pedidoId), fetchEmpresa()])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const AZUL   = [30,  58,  95]
  const TEAL   = [31, 122, 122]
  const GRIS   = [51,  51,  51]
  const BLANCO = [255, 255, 255]
  const W = 210
  const M = 14

  // ── Encabezado azul
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(empresa?.nombre || 'Empresa', M, 11)
doc.setFontSize(8)
doc.setFont('helvetica', 'normal')
if (empresa?.email)     doc.text(empresa.email,     M, 17)
if (empresa?.direccion) doc.text(empresa.direccion, M, 22)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PEDIDO DE COMPRA', W - M, 11, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(p.codigo, W - M, 17, { align: 'right' })
  if (empresa?.telefono) doc.text(empresa.telefono, W - M, 22, { align: 'right' })

  // ── Datos del pedido
  doc.setTextColor(...GRIS)
  let y = 36

  doc.setFillColor(242, 245, 248)
  doc.roundedRect(M, y, W - M * 2, 32, 2, 2, 'F')

  const col1 = M + 4
  const col2 = W / 2 + 4

  const campos = [
    ['Proveedor',    p.proveedor?.nombre || '—',                              col1, y + 7],
    ['País origen',  p.proveedor?.pais?.nombre || '—',                        col1, y + 14],
    ['Incoterm',     p.incoterm,                                               col1, y + 21],
    ['Moneda',       p.moneda,                                                 col1, y + 28],
    ['Fecha pedido', new Date(p.fecha_pedido).toLocaleDateString('es-CR'),    col2, y + 7],
    ['Cliente',      p.cliente?.nombre || 'Sin cliente',                      col2, y + 14],
    ['Estado',       p.estado.replace(/_/g, ' ').toUpperCase(),               col2, y + 21],
    ['Código',       p.codigo,                                                 col2, y + 28],
  ]

  campos.forEach(([label, valor, x, cy]) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEAL)
    doc.text(label + ':', x, cy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(String(valor), x + 24, cy)
  })

  y += 38

  // ── Nota
  if (p.nota) {
    doc.setFillColor(251, 243, 227)
    doc.roundedRect(M, y, W - M * 2, 10, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(125, 78, 0)
    doc.text('Nota:', M + 3, y + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(p.nota, M + 16, y + 6.5)
    y += 14
  }

  // ── Título tabla
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AZUL)
  doc.text('LÍNEAS DEL PEDIDO', M, y + 6)
  y += 10

  const total = (p.lineas || []).reduce((s, l) => s + Number(l.total_linea), 0)

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#', 'SKU', 'Producto', 'Cantidad', 'Precio Unit.', 'Total', 'Nota']],
    body: (p.lineas || []).map(l => [
      l.numero,
      l.producto?.sku || '—',
      l.producto?.nombre || '—',
      Number(l.cantidad).toLocaleString('en'),
      `${p.moneda} ${Number(l.precio_unit).toFixed(2)}`,
      `${p.moneda} ${Number(l.total_linea).toLocaleString('en', { minimumFractionDigits: 2 })}`,
      l.nota || '—',
    ]),
    foot: [['', '', '', '', 'TOTAL', `${p.moneda} ${total.toLocaleString('en', { minimumFractionDigits: 2 })}`, '']],
    headStyles:         { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 8 },
    footStyles:         { fillColor: [242, 245, 248], textColor: AZUL, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:         { fontSize: 8, textColor: GRIS },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 55 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      6: { cellWidth: 30 },
    },
  })

  // ── Pie de página
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...AZUL)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${empresa?.nombre || ''} | Documento generado automáticamente`, M, 293)
    doc.text(`Página ${i} de ${totalPages}`, W - M, 293, { align: 'right' })
  }

  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ── Exportar Excel — todo en una sola hoja
export const exportarExcel = async (pedidoId) => {
  const [p, empresa] = await Promise.all([fetchPedido(pedidoId), fetchEmpresa()])

  const wb   = XLSX.utils.book_new()
  const total = (p.lineas || []).reduce((s, l) => s + Number(l.total_linea), 0)

  const ws = XLSX.utils.aoa_to_sheet([
    // Encabezado empresa
   [empresa?.nombre    || ''],
[empresa?.email     || ''],
[empresa?.direccion || ''],
    [],
    // Info pedido
    ['PEDIDO DE COMPRA'],
    ['Código',       p.codigo],
    ['Proveedor',    p.proveedor?.nombre || '—'],
    ['País',         p.proveedor?.pais?.nombre || '—'],
    ['Fecha pedido', new Date(p.fecha_pedido).toLocaleDateString('es-CR')],
    ['Incoterm',     p.incoterm],
    ['Moneda',       p.moneda],
    ['Estado',       p.estado.replace(/_/g, ' ')],
    ['Cliente',      p.cliente?.nombre || 'Sin cliente'],
    ...(p.nota ? [['Nota', p.nota]] : []),
    [],
    // Líneas
    ['LÍNEAS DEL PEDIDO'],
    ['#', 'SKU', 'Producto', 'Cantidad', 'Precio Unitario', 'Total Línea', 'Nota'],
    ...(p.lineas || []).map(l => [
      l.numero,
      l.producto?.sku || '',
      l.producto?.nombre || '',
      Number(l.cantidad),
      Number(l.precio_unit),
      Number(l.total_linea),
      l.nota || '',
    ]),
    [],
    ['', '', '', '', 'TOTAL', total, ''],
  ])

  XLSX.utils.book_append_sheet(wb, ws, 'Pedido')
  XLSX.writeFile(wb, `${p.codigo}.xlsx`)
}

// ── Exportar proyección de costeo
export const exportarCosteo = async (pedidoId) => {
  const [p, empresa] = await Promise.all([fetchPedido(pedidoId), fetchEmpresa()])

  const wb    = XLSX.utils.book_new()
  const total = (p.lineas || []).reduce((s, l) => s + Number(l.total_linea), 0)

  const ws = XLSX.utils.aoa_to_sheet([
    [empresa?.nombre || ''],
[empresa?.email  || ''],
    ['Proyección de Costeo'],
    [],
    ['Pedido',       p.codigo],
    ['Proveedor',    p.proveedor?.nombre || '—'],
    ['Incoterm',     p.incoterm],
    ['Moneda',       p.moneda],
    ['Fecha',        new Date(p.fecha_pedido).toLocaleDateString('es-CR')],
    [],
    ['LÍNEAS DE PRODUCTO'],
    ['#', 'SKU', 'Producto', 'Cantidad', 'Precio Unit.', 'Costo FOB', 'Nota'],
    ...(p.lineas || []).map(l => [
      l.numero,
      l.producto?.sku || '',
      l.producto?.nombre || '',
      Number(l.cantidad),
      Number(l.precio_unit),
      Number(l.total_linea),
      l.nota || '',
    ]),
    [],
    ['', '', '', '', 'COSTO FOB TOTAL', total, ''],
    [],
    ['PLANTILLA DE COSTEO'],
    ['Concepto', 'Valor (USD)', 'Notas'],
    ['Flete marítimo', '', ''],
    ['Seguro', '', ''],
    ['Valor CIF (FOB + Flete + Seguro)', '', 'Calculado'],
    ['Arancel %', '', 'Porcentaje sobre CIF'],
    ['ISC %', '', 'Porcentaje sobre CIF'],
    ['Agente aduanero', '', ''],
    ['Flete CR', '', ''],
    ['Bodega / almacenaje', '', ''],
    ['Otros costos', '', ''],
    ['COSTO TOTAL CR', '', 'Suma de todos los costos'],
    [],
    ['Tipo de cambio USD/CRC', '', 'BCCR del día'],
    ['Margen %', '', 'Porcentaje de ganancia'],
  ])

  XLSX.utils.book_append_sheet(wb, ws, 'Proyección costeo')
  XLSX.writeFile(wb, `costeo-${p.codigo}.xlsx`)
}

// ── Exportar Costeo PDF
export const exportarCosteoPDF = async (costeoId, datos) => {
  const empresa = await fetchEmpresa()
  const { costeo, lineas, calculos, pedidosInfo } = datos

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const AZUL   = [30, 58, 95]
  const TEAL   = [31, 122, 122]
  const GRIS   = [51, 51, 51]
  const BLANCO = [255, 255, 255]
  const W = 297; const M = 14

  // Encabezado
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 26, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text(empresa?.nombre || '', M, 11)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  if (empresa?.email)     doc.text(empresa.email,     M, 17)
  if (empresa?.direccion) doc.text(empresa.direccion, M, 22)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text('COSTEO DE IMPORTACIÓN', W - M, 11, { align: 'right' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text(costeo.referencia || `Costeo #${costeoId}`, W - M, 17, { align: 'right' })
  doc.text(costeo.tipo === 'aproximacion' ? 'Aproximación' : 'Real', W - M, 22, { align: 'right' })

  // Info general
  let y = 34
  doc.setFillColor(242, 245, 248)
  doc.roundedRect(M, y, W - M * 2, 18, 2, 2, 'F')
  const infoCols = [
    ['TC USD/CRC',    `₡${Number(costeo.tc_usd_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`],
    ['FOB total',     `USD ${calculos.fob_total.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['CIF',           `USD ${calculos.cif.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['Valor CIF',     `USD ${calculos.val_cif.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['Arancel',       `USD ${calculos.arancel.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['Otros CR',      `USD ${calculos.otros.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['Costo total',   `USD ${calculos.total_cr.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['Margen',        `${calculos.margen}%`],
    ['P.Venta total', `USD ${calculos.pvTotal.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ['Utilidad',      `USD ${calculos.utilidad.toLocaleString('en', { minimumFractionDigits: 2 })}`],
  ]
  const colW = (W - M * 2) / infoCols.length
  infoCols.forEach(([label, val], i) => {
    const x = M + 3 + i * colW
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEAL)
    doc.text(label, x, y + 7)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS)
    doc.text(String(val), x, y + 14)
  })
  y += 22

  // Pedidos asociados
  if (pedidosInfo?.length) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AZUL)
    doc.text('PEDIDOS ASOCIADOS', M, y)
    y += 3
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [['Pedido', 'Proveedor', 'País', 'Incoterm', 'Moneda', 'Fecha', 'Estado', 'Líneas', 'FOB total']],
      body: pedidosInfo.map(p => [
        p.codigo,
        p.proveedor?.nombre || '—',
        p.proveedor?.pais?.nombre || '—',
        p.incoterm || '—',
        p.moneda || '—',
        p.fecha_pedido ? new Date(p.fecha_pedido).toLocaleDateString('es-CR') : '—',
        p.estado || '—',
        p.lineas?.length ?? 0,
        `USD ${(p.lineas || []).reduce((s, l) => s + Number(l.total_linea || 0), 0).toLocaleString('en', { minimumFractionDigits: 2 })}`,
      ]),
      headStyles: { fillColor: TEAL, textColor: BLANCO, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: GRIS },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Líneas de producto
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AZUL)
  doc.text('DESGLOSE POR LÍNEA DE PRODUCTO', M, y)
  y += 3
  autoTable(doc, {
    startY: y, margin: { left: M, right: M },
    head: [['Producto', 'SKU', 'Pedido', 'Cant.', 'FOB unit', 'Flete+Seg', 'CIF', 'Imp.IVA', 'Agente', 'Flete CR', 'Bodega', 'Costo total', 'Costo unit', 'Margen', 'P.Venta unit']],
    body: lineas.map(({ linea: l, calc: c, pedidoCodigo }) => [
      l.producto?.nombre || '—',
      l.producto?.sku || '—',
      pedidoCodigo || '—',
      Number(l.cantidad).toLocaleString('en'),
      c.fobUnit.toFixed(2),       c.fleteSeguro.toFixed(2),
      c.cifLinea.toFixed(2),      c.impLinea.toFixed(2),
      c.agenteLinea.toFixed(2),   c.fleteCrLinea.toFixed(2),
      c.bodegaLinea.toFixed(2),   c.costoTotal.toFixed(2),
      c.costoUnitCR.toFixed(2),   `${calculos.margen}%`,
      c.pVentaUnit.toFixed(2),
    ]),
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontSize: 6.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 6.5, textColor: GRIS },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 18 } },
  })

  // Resumen financiero final
const yFinal = doc.lastAutoTable.finalY + 8
if (yFinal < 185) {
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AZUL)
  doc.text('RESUMEN FINANCIERO', M, yFinal)
  
  autoTable(doc, {
    startY: yFinal + 3,
    margin: { left: M, right: M / 2 },
    tableWidth: 80,
    head: [['Concepto', 'Valor (USD)']],
    body: [
      ['Costo origen (FOB)',   `USD ${calculos.fob_total.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      ['Flete + seguro',       `USD ${calculos.cif.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      ['Valor CIF',            `USD ${calculos.val_cif.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      ['Arancel',              `USD ${calculos.arancel.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      ['Agente + otros CR',    `USD ${calculos.otros.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      ['Costo total CR',       `USD ${calculos.total_cr.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      [`Precio venta (${calculos.margen}%)`, `USD ${calculos.pvTotal.toLocaleString('en', { minimumFractionDigits: 2 })}`],
      ['Utilidad bruta',       `USD ${calculos.utilidad.toLocaleString('en', { minimumFractionDigits: 2 })}`],
    ],
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: GRIS },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  })
}
  // Pie
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...AZUL)
    doc.rect(0, 203, W, 7, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(6)
    doc.text(`${empresa?.nombre || ''} | Documento generado automáticamente`, M, 207)
    doc.text(`Página ${i} de ${totalPages}`, W - M, 207, { align: 'right' })
  }

  window.open(URL.createObjectURL(doc.output('blob')), '_blank')
}

// ── Exportar Costeo Excel
export const exportarCosteoExcel = async (costeoId, datos) => {
  const empresa = await fetchEmpresa()
  const { costeo, lineas, calculos, pedidosInfo } = datos

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    [empresa?.nombre || ''],
    [empresa?.email  || ''],
    [empresa?.direccion || ''],
    [],
    ['COSTEO DE IMPORTACIÓN'],
    ['Referencia', costeo.referencia || `Costeo #${costeoId}`],
    ['Tipo',       costeo.tipo === 'aproximacion' ? 'Aproximación' : 'Real'],
    ['Estado',     costeo.estado],
    ['TC USD/CRC', Number(costeo.tc_usd_crc)],
    [],
    ['RESUMEN FINANCIERO'],
    ['FOB total',          calculos.fob_total],
    ['Flete + Seguro',     calculos.cif],
    ['Valor CIF',          calculos.val_cif],
    ['Arancel',            calculos.arancel],
    ['ISC',                calculos.isc],
    ['Otros CR',           calculos.otros],
    ['Costo total CR',     calculos.total_cr],
    ['Margen %',           calculos.margen],
    ['Precio venta total', calculos.pvTotal],
    ['Utilidad bruta',     calculos.utilidad],
    [],
    ...(pedidosInfo?.length ? [
      ['PEDIDOS ASOCIADOS'],
      ['Pedido', 'Proveedor', 'País', 'Incoterm', 'Moneda', 'Fecha', 'Estado', 'Líneas', 'FOB total'],
      ...pedidosInfo.map(p => [
        p.codigo,
        p.proveedor?.nombre || '—',
        p.proveedor?.pais?.nombre || '—',
        p.incoterm || '—',
        p.moneda || '—',
        p.fecha_pedido ? new Date(p.fecha_pedido).toLocaleDateString('es-CR') : '—',
        p.estado || '—',
        p.lineas?.length ?? 0,
        (p.lineas || []).reduce((s, l) => s + Number(l.total_linea || 0), 0),
      ]),
      [],
    ] : []),
    ['DESGLOSE POR LÍNEA DE PRODUCTO'],
    ['Producto','SKU','Pedido','Cantidad','FOB unit','Flete+Seg','CIF','Imp.IVA','Agente','Flete CR','Bodega','Costo total','Costo unit CR','Margen %','P.Venta unit','P.Venta total'],
    ...lineas.map(({ linea: l, calc: c, pedidoCodigo }) => [
      l.producto?.nombre || '',
      l.producto?.sku    || '',
      pedidoCodigo || '—',
      Number(l.cantidad),
      c.fobUnit, c.fleteSeguro, c.cifLinea, c.impLinea,
      c.agenteLinea, c.fleteCrLinea, c.bodegaLinea,
      c.costoTotal, c.costoUnitCR, calculos.margen,
      c.pVentaUnit, c.pVentaTotal,
    ]),
    [],
    ['', '', '', '', '', '', '', '', '', '', '', calculos.total_cr, '', '', '', calculos.pvTotal],
  [],
['RESUMEN FINANCIERO'],
['Concepto', 'Valor (USD)'],
['Costo origen (FOB)',          calculos.fob_total],
['Flete + seguro',              calculos.cif],
['Valor CIF',                   calculos.val_cif],
['Arancel',                     calculos.arancel],
['Agente + otros CR',           calculos.otros],
['Costo total CR',              calculos.total_cr],
[`Precio venta (${calculos.margen}%)`, calculos.pvTotal],
['Utilidad bruta',              calculos.utilidad],
])

  XLSX.utils.book_append_sheet(wb, ws, 'Costeo')
  XLSX.writeFile(wb, `costeo-${costeo.referencia || costeoId}.xlsx`)
}