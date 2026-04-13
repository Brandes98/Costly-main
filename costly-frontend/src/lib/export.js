import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Descarga un archivo Excel con los datos del reporte.
 * @param {string[]} headers - Encabezados de columna
 * @param {any[][]} rows     - Filas (strings o números)
 * @param {string}  filename - Nombre del archivo sin extensión
 */
export function exportExcel(headers, rows, filename = 'reporte') {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Descarga un archivo PDF con los datos del reporte.
 * @param {string[]} headers - Encabezados de columna
 * @param {any[][]} rows     - Filas
 * @param {string}  title    - Título visible en el PDF
 * @param {string}  filename - Nombre del archivo sin extensión
 */
export function exportPdf(headers, rows, title = 'Reporte', filename = 'reporte') {
  const doc = new jsPDF({ orientation: rows[0]?.length > 5 ? 'landscape' : 'portrait' })
  doc.setFontSize(13)
  doc.text(title, 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado: ${new Date().toLocaleString('es-CR')}`, 14, 21)
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((v) => (v == null ? '—' : String(v)))),
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [13, 74, 74], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 247] },
  })
  doc.save(`${filename}.pdf`)
}
