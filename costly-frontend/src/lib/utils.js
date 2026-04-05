import { clsx } from 'clsx'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Combinar clases
export const cn = (...args) => clsx(args)

// ── Formatear moneda
export const fmtCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ── Formatear fecha
export const fmtDate = (date) => {
  if (!date) return '—'
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy', { locale: es })
}

// ── Semáforo por días restantes
export const getSemaforo = (fechaPlan) => {
  if (!fechaPlan) return null
  const dias = differenceInDays(parseISO(fechaPlan), new Date())
  if (dias < 0)  return 'red'
  if (dias <= 3) return 'yellow'
  return 'green'
}

// ── Clase del semáforo
export const semaforoClass = (color) => ({
  red:    's3r',
  yellow: 's3y',
  green:  's3g',
}[color] || 's3g')

export const importacionSemaforoClass = (estado) => ({
  borrador: 's3y',
  en_proceso: 's3y',
  en_transito: 's3r',
  en_aduana: 's3y',
  en_bodega: 's3g',
  cerrada: 's3g',
}[estado] || 's3y')

// ── Pill de estado de pedido
export const estadoPillClass = (estado) => ({
  borrador:      'pill-gray',
  confirmado:    'pill-gray',
  en_produccion: 'pill-gray',
  listo_fabrica: 'pill-yellow',
  embarcado:     'pill-blue',
  en_transito:   'pill-blue',
  en_puerto_cr:  'pill-yellow',
  en_aduana:     'pill-yellow',
  en_bodega:     'pill-violet',
  entregado:     'pill-green',
  cerrado:       'pill-green',
  cancelado:     'pill-red',
}[estado] || 'pill-gray')

// ── Label de estado legible
export const estadoLabel = (estado) => ({
  borrador:      'Borrador',
  confirmado:    'Confirmado',
  en_produccion: 'En producción',
  listo_fabrica: 'Listo fábrica',
  embarcado:     'Embarcado',
  en_transito:   'En tránsito',
  en_puerto_cr:  'En puerto CR',
  en_aduana:     'En aduana',
  en_bodega:     'En bodega',
  entregado:     'Entregado',
  cerrado:       'Cerrado',
  cancelado:     'Cancelado',
}[estado] || estado)

export const pedidoEstadoOptions = [
  'borrador',
  'confirmado',
  'en_produccion',
  'listo_fabrica',
  'embarcado',
  'en_transito',
  'en_puerto_cr',
  'en_aduana',
  'en_bodega',
  'entregado',
  'cerrado',
  'cancelado',
]

export const importacionEstadoPillClass = (estado) => ({
  borrador: 'pill-gray',
  en_proceso: 'pill-blue',
  en_transito: 'pill-blue',
  en_aduana: 'pill-yellow',
  en_bodega: 'pill-green',
  cerrada: 'pill-violet',
}[estado] || 'pill-gray')

export const importacionEstadoLabel = (estado) => ({
  borrador: 'Borrador',
  en_proceso: 'En proceso',
  en_transito: 'En tránsito',
  en_aduana: 'En aduana',
  en_bodega: 'En bodega',
  cerrada: 'Cerrada',
}[estado] || estado)

export const pagoEstadoPillClass = (estado) => ({
  programado: 'pill-yellow',
  procesado: 'pill-blue',
  confirmado: 'pill-green',
  devuelto: 'pill-red',
}[estado] || 'pill-gray')

export const pagoEstadoLabel = (estado) => ({
  programado: 'Programado',
  procesado: 'Procesado',
  confirmado: 'Confirmado',
  devuelto: 'Devuelto',
}[estado] || estado)

export const pagoTipoLabel = (tipo) => ({
  senal: 'Señal',
  saldo: 'Saldo',
  total: 'Total',
  anticipo: 'Anticipo',
  devolucion: 'Devolución',
}[tipo] || tipo)

export const pagoMetodoLabel = (metodo) => ({
  swift: 'SWIFT',
  transferencia_local: 'Transferencia local',
  cheque: 'Cheque',
  efectivo: 'Efectivo',
}[metodo] || '—')

// ── Truncar texto
export const truncate = (str, n = 30) =>
  str?.length > n ? str.slice(0, n) + '…' : str
