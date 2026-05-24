// ============================================================
// src/modules/pedidos/export.service.js
// ============================================================
import prisma  from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import jsPDF   from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ── Helper: obtener pedido completo
const getPedidoCompleto = async (empresa_id, pedido_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: {
      proveedor: { include: { pais: true } },
      cliente:   true,
      lineas:    { include: { producto: true } },
      empresa:   true,
    }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  return pedido
}

// ── Exportar PDF
export const exportPDF = async (empresa_id, pedido_id) => {
  const p   = await getPedidoCompleto(empresa_id, pedido_id)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const AZUL  = [30,  58,  95]
  const TEAL  = [31, 122, 122]
  const GRIS  = [51,  51,  51]
  const BLANCO= [255,255,255]
  const W     = 210
  const M     = 14   // margen

  // ── Encabezado
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('COSTLY', M, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión de Compras e Importaciones', M, 18)
  doc.text('Distribuidora y Servicios Vadibarot Ltda.', M, 23)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`PEDIDO DE COMPRA`, W - M, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(p.codigo, W - M, 18, { align: 'right' })

  // ── Datos del pedido
  doc.setTextColor(...GRIS)
  let y = 36

  // Recuadro de datos
  doc.setFillColor(242, 245, 248)
  doc.roundedRect(M, y, W - M*2, 32, 2, 2, 'F')

  const col1 = M + 4
  const col2 = W / 2 + 4

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)

  const campos = [
    ['Proveedor',    p.proveedor?.nombre || '—',                     col1, y + 7],
    ['País origen',  p.proveedor?.pais?.nombre || '—',               col1, y + 14],
    ['Incoterm',     p.incoterm,                                      col1, y + 21],
    ['Moneda',       p.moneda,                                        col1, y + 28],
    ['Fecha pedido', new Date(p.fecha_pedido).toLocaleDateString('es-CR'), col2, y + 7],
    ['Cliente',      p.cliente?.nombre || 'Sin cliente',              col2, y + 14],
    ['Estado',       p.estado.replace(/_/g,' ').toUpperCase(),        col2, y + 21],
    ['Código',       p.codigo,                                        col2, y + 28],
  ]

  campos.forEach(([label, valor, x, cy]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEAL)
    doc.text(label + ':', x, cy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(String(valor), x + 24, cy)
  })

  y += 38

  // Nota si existe
  if (p.nota) {
    doc.setFillColor(251, 243, 227)
    doc.roundedRect(M, y, W - M*2, 10, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(125, 78, 0)
    doc.text('Nota:', M + 3, y + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(p.nota, M + 16, y + 6.5)
    y += 14
  }

  // ── Tabla de líneas
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AZUL)
  doc.text('LÍNEAS DEL PEDIDO', M, y + 6)
  y += 10

  const total = p.lineas.reduce((s, l) => s + Number(l.total_linea), 0)

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#', 'SKU', 'Producto', 'Cantidad', 'Precio Unit.', 'Total', 'Nota']],
    body: p.lineas.map(l => [
      l.numero,
      l.producto?.sku || '—',
      l.producto?.nombre || '—',
      Number(l.cantidad).toLocaleString('en'),
      `${p.moneda} ${Number(l.precio_unit).toFixed(2)}`,
      `${p.moneda} ${Number(l.total_linea).toLocaleString('en', { minimumFractionDigits: 2 })}`,
      l.nota || '—',
    ]),
    foot: [['', '', '', '', 'TOTAL', `${p.moneda} ${total.toLocaleString('en', { minimumFractionDigits: 2 })}`, '']],
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [242, 245, 248], textColor: AZUL, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: GRIS },
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
    doc.text('Costly — Vadibarot Ltda. | Documento generado automáticamente', M, 293)
    doc.text(`Página ${i} de ${totalPages}`, W - M, 293, { align: 'right' })
  }

  return doc.output('arraybuffer')
}

// ── Exportar CSV/Excel
export const exportExcel = async (empresa_id, pedido_id) => {
  const p = await getPedidoCompleto(empresa_id, pedido_id)

  const wb = XLSX.utils.book_new()

  // Hoja 1: Datos generales
  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['COSTLY — Vadibarot Ltda.'],
    ['Pedido de Compra'],
    [],
    ['Código',       p.codigo],
    ['Proveedor',    p.proveedor?.nombre || '—'],
    ['País',         p.proveedor?.pais?.nombre || '—'],
    ['Fecha pedido', new Date(p.fecha_pedido).toLocaleDateString('es-CR')],
    ['Incoterm',     p.incoterm],
    ['Moneda',       p.moneda],
    ['Estado',       p.estado],
    ['Cliente',      p.cliente?.nombre || 'Sin cliente'],
    ['Nota',         p.nota || ''],
  ])
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Datos generales')

  // Hoja 2: Líneas
  const total = p.lineas.reduce((s, l) => s + Number(l.total_linea), 0)
  const wsLineas = XLSX.utils.aoa_to_sheet([
    ['#', 'SKU', 'Producto', 'Descripción', 'Cantidad', 'Precio Unitario', 'Total Línea', 'Nota'],
    ...p.lineas.map(l => [
      l.numero,
      l.producto?.sku || '',
      l.producto?.nombre || '',
      l.producto?.descripcion || '',
      Number(l.cantidad),
      Number(l.precio_unit),
      Number(l.total_linea),
      l.nota || '',
    ]),
    [],
    ['', '', '', '', '', 'TOTAL', total, ''],
  ])
  XLSX.utils.book_append_sheet(wb, wsLineas, 'Líneas')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// ── Exportar proyección de costeo
export const exportCosteo = async (empresa_id, pedido_id) => {
  const p = await getPedidoCompleto(empresa_id, pedido_id)

  const wb    = XLSX.utils.book_new()
  const total = p.lineas.reduce((s, l) => s + Number(l.total_linea), 0)

  const ws = XLSX.utils.aoa_to_sheet([
    ['COSTLY — Proyección de Costeo'],
    ['Vadibarot Ltda.'],
    [],
    ['Pedido',       p.codigo],
    ['Proveedor',    p.proveedor?.nombre || '—'],
    ['Incoterm',     p.incoterm],
    ['Moneda',       p.moneda],
    ['Fecha',        new Date(p.fecha_pedido).toLocaleDateString('es-CR')],
    [],
    ['── LÍNEAS DE PRODUCTO ──'],
    ['#', 'SKU', 'Producto', 'Cantidad', 'Precio Unit. (USD)', 'Costo FOB', 'Nota'],
    ...p.lineas.map(l => [
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
    ['── PLANTILLA DE COSTEO ──'],
    ['Concepto', 'Valor (USD)', 'Notas'],
    ['Flete marítimo', '', ''],
    ['Seguro', '', ''],
    ['Valor CIF (FOB + Flete + Seguro)', `=B${13 + p.lineas.length}+B${16 + p.lineas.length}+B${17 + p.lineas.length}`, 'Calculado'],
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
    ['IVA D-150 (referencia)', '', 'No va al costo'],
  ])

  XLSX.utils.book_append_sheet(wb, ws, 'Proyección costeo')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
