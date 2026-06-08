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

const fetchEmpresa = async () => {
  const res = await api.get('/empresa')
  return res?.data ?? res
}

// ── Exportar PDF
export const exportarPDF = async (importacionId) => {
  const [imp, empresa] = await Promise.all([fetchImportacion(importacionId), fetchEmpresa()])
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
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text(empresa?.nombre || '', M, 11)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  if (empresa?.email)     doc.text(empresa.email,     M, 17)
  if (empresa?.direccion) doc.text(empresa.direccion, M, 22)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text('IMPORTACIÓN', W - M, 11, { align: 'right' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(imp.codigo, W - M, 17, { align: 'right' })
  if (empresa?.telefono) doc.text(empresa.telefono, W - M, 22, { align: 'right' })

  // Datos generales
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
    head: [['Código', 'Proveedor', 'Estado', 'Incoterm', 'Moneda', 'Líneas', 'FOB total']],
    body: pedidos.map(p => {
      const fob = (p.lineas || []).reduce((s, l) => s + Number(l.total_linea || 0), 0)
      return [
        p.codigo,
        p.proveedor?.nombre || '—',
        (p.estado||'').replace(/_/g,' '),
        p.incoterm || '—',
        p.moneda || '—',
        p.lineas?.length ?? 0,
        `${p.moneda || 'USD'} ${fob.toLocaleString('en', { minimumFractionDigits: 2 })}`,
      ]
    }),
    headStyles: { fillColor: AZUL, textColor: BLANCO, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: GRIS },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  y = doc.lastAutoTable.finalY + 8

  // Líneas de productos
  const todasLineas = pedidos.flatMap(p =>
    (p.lineas || []).map(l => ({ ...l, _pedidoCodigo: p.codigo, _moneda: p.moneda }))
  )

  if (todasLineas.length > 0) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AZUL)
    doc.text('LÍNEAS DE PRODUCTOS', M, y)
    y += 4

    const totalGeneral = todasLineas.reduce((s, l) => s + Number(l.total_linea || 0), 0)

    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [['Pedido', 'SKU', 'Producto', 'Categoría', 'Cantidad', 'Precio unit.', 'Total línea']],
      body: todasLineas.map(l => [
        l._pedidoCodigo,
        l.producto?.sku || '—',
        l.producto?.nombre || '—',
        l.producto?.categoria || '—',
        Number(l.cantidad || 0).toLocaleString('en'),
        `${l._moneda} ${Number(l.precio_unit || 0).toFixed(2)}`,
        `${l._moneda} ${Number(l.total_linea || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`,
      ]),
      foot: [['', '', '', '', '', 'TOTAL', `${pedidos[0]?.moneda || 'USD'} ${totalGeneral.toLocaleString('en', { minimumFractionDigits: 2 })}`]],
      headStyles:  { fillColor: TEAL, textColor: BLANCO, fontStyle: 'bold', fontSize: 8 },
      footStyles:  { fillColor: [242, 245, 248], textColor: AZUL, fontStyle: 'bold', fontSize: 9 },
      bodyStyles:  { fontSize: 8, textColor: GRIS },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
    })
  }

  // Pie
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...AZUL)
    doc.rect(0, 287, W, 10, 'F')
    doc.setTextColor(...BLANCO); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text(`${empresa?.nombre || ''} | Documento generado automáticamente`, M, 293)
    doc.text(`Página ${i} de ${totalPages}`, W - M, 293, { align: 'right' })
  }

  window.open(URL.createObjectURL(doc.output('blob')), '_blank')
}

// ── Exportar Excel — todo en una sola hoja
export const exportarExcel = async (importacionId) => {
  const [imp, empresa] = await Promise.all([fetchImportacion(importacionId), fetchEmpresa()])
  const wb = XLSX.utils.book_new()

  const pedidos = imp.pedidos || []
  const todasLineas = pedidos.flatMap(p =>
    (p.lineas || []).map(l => ({ ...l, _pedidoCodigo: p.codigo, _moneda: p.moneda }))
  )
  const totalGeneral = todasLineas.reduce((s, l) => s + Number(l.total_linea || 0), 0)

  const ws = XLSX.utils.aoa_to_sheet([
    // Encabezado empresa
    [empresa?.nombre || ''],
    [empresa?.email || ''],
    [empresa?.direccion || ''],
    [],
    // Info importación
    ['IMPORTACIÓN'],
    ['Código',      imp.codigo],
    ['Estado',      (imp.estado || '').replace(/_/g, ' ')],
    ['Tipo',        imp.consolidado ? 'Consolidada' : 'Individual'],
    ['Fecha unión', new Date(imp.fecha_union || imp.creado_en).toLocaleDateString('es-CR')],
    ['Contenedor',  imp.contenedor || '—'],
    ...(imp.nota ? [['Nota', imp.nota]] : []),
    [],
    // Pedidos
    ['PEDIDOS'],
    ['Código', 'Proveedor', 'Estado', 'Incoterm', 'Moneda', 'Líneas', 'FOB total'],
    ...pedidos.map(p => {
      const fob = (p.lineas || []).reduce((s, l) => s + Number(l.total_linea || 0), 0)
      return [
        p.codigo,
        p.proveedor?.nombre || '—',
        (p.estado || '').replace(/_/g, ' '),
        p.incoterm || '—',
        p.moneda || '—',
        p.lineas?.length ?? 0,
        fob,
      ]
    }),
    [],
    // Líneas de productos
    ['LÍNEAS DE PRODUCTOS'],
    ['Pedido', 'SKU', 'Producto', 'Categoría', 'Cantidad', 'Precio unitario', 'Total línea'],
    ...todasLineas.map(l => [
      l._pedidoCodigo,
      l.producto?.sku || '',
      l.producto?.nombre || '',
      l.producto?.categoria || '',
      Number(l.cantidad || 0),
      Number(l.precio_unit || 0),
      Number(l.total_linea || 0),
    ]),
    [],
    ['', '', '', '', '', 'TOTAL', totalGeneral],
  ])

  XLSX.utils.book_append_sheet(wb, ws, 'Importación')
  XLSX.writeFile(wb, `${imp.codigo}.xlsx`)
}
