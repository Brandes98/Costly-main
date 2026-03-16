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

// ── Truncar texto
export const truncate = (str, n = 30) =>
  str?.length > n ? str.slice(0, n) + '…' : str
