// ============================================================
// src/hooks/useExportImportacion.js
// ============================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import api from '../lib/api'

const fetchImportacion = async (id) => {
  const res = await api.get(`/importaciones/${id}`)
  return res?.data ?? res
}

// ── Exportar PDF
export const exportarPDF = async (importacionId) => {
  const imp = await fetchImportacion(importacionId)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const AZUL   = [30, 58, 95]
  const TEAL   = [31, 122, 122]
  const GRIS   = [51, 51, 51]
  const BLANCO = [255, 255, 255]
  const W = 210, M = 14

  // Encabezado
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text('COSTLY', M, 12)
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión de Compras e Importaciones', M, 18)
  doc.text('Distribuidora y Servicios Vadibarot Ltda.', M, 23)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text('IMPORTACIÓN', W - M, 12, { align: 'right' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(imp.codigo, W - M, 18, { align: 'right' })

  // Datos
  let y = 36
  doc.setFillColor(242, 245, 248)
  doc.roundedRect(M, y, W - M*2, 24, 2, 2, 'F')

  const campos = [
    ['Código',      imp.codigo,                                                    M+4,    y+7],
    ['Estado',      (imp.estado||'').replace(/_/g,' ').toUpperCase(),              M+4,    y+14],
    ['Tipo',        imp.consolidado ? 'Consolidada' : 'Individual',                M+4,    y+21],
    ['Fecha unión', new Date(imp.fecha_union||imp.creado_en).toLocaleDateString('es-CR'), W/2+4, y+7],
    ['Pedidos',     String(imp.pedidos?.length || 0),                              W/2+4,  y+14],
    ['Contenedor',  imp.contenedor || '—',                                         W/2+4,  y+21],
  ]
  campos.forEach(([label, valor, x, cy]) => {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEAL)
    doc.text(label + ':', x, cy)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS)
    doc.text(String(valor), x + 24, cy)
  })
  y += 30

  // Pedidos
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AZUL)
  doc.text('PEDIDOS DE LA IMPORTACIÓN', M, y + 6)
  y += 10

  const pedidos = imp.pedidos || []
  autoTable(doc, {
    startY: y, margin: { left: M, right: M },
    head: [['Código', 'Proveedor', 'Estado', 'Incoterm', 'Moneda', 'Líneas']],
    body: pedidos.map(p => [
      p.codigo, p.proveedor?.nombre || '—',
      (p.estado||'').replace(/_/g,' '), p.incoterm || '—',
      p.moneda || '—', p.lineas?.length ?? 0,
    ]),
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: GRIS },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  // Pie
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...AZUL)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(...BLANCO); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text('Costly — Vadibarot Ltda. | Documento generado automáticamente', M, 293)
    doc.text(`Página ${i} de ${totalPages}`, W - M, 293, { align: 'right' })
  }

  const blob = doc.output('blob')
  window.open(URL.createObjectURL(blob), '_blank')
}

// ── Exportar Excel
export const exportarExcel = async (importacionId) => {
  const imp = await fetchImportacion(importacionId)
  const wb  = XLSX.utils.book_new()

  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['COSTLY — Vadibarot Ltda.'],
    ['Importación de Compras'],
    [],
    ['Código',      imp.codigo],
    ['Estado',      imp.estado],
    ['Tipo',        imp.consolidado ? 'Consolidada' : 'Individual'],
    ['Fecha unión', new Date(imp.fecha_union||imp.creado_en).toLocaleDateString('es-CR')],
    ['Contenedor',  imp.contenedor || '—'],
    ['Nota',        imp.nota || ''],
  ])
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Datos generales')

  const wsPedidos = XLSX.utils.aoa_to_sheet([
    ['Código', 'Proveedor', 'Estado', 'Incoterm', 'Moneda', 'Líneas'],
    ...(imp.pedidos || []).map(p => [
      p.codigo, p.proveedor?.nombre || '', p.estado,
      p.incoterm || '', p.moneda || '', p.lineas?.length ?? 0,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos')

  XLSX.writeFile(wb, `${imp.codigo}.xlsx`)
}
