import { clsx } from 'clsx'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ══════════════════════════════════════════════
// GENERAL
// ══════════════════════════════════════════════
export const cn = (...args) => clsx(args)

export const truncate = (str, n = 30) =>
  str?.length > n ? str.slice(0, n) + '…' : str

// ══════════════════════════════════════════════
// FORMATO
// ══════════════════════════════════════════════
export const fmtCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const fmtDate = (date) => {
  if (!date) return '—'
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy', { locale: es })
}

// ══════════════════════════════════════════════
// SEMÁFORO
// ══════════════════════════════════════════════
export const getSemaforo = (fechaPlan) => {
  if (!fechaPlan) return null
  const dias = differenceInDays(parseISO(fechaPlan), new Date())
  if (dias < 0) return 'red'
  if (dias <= 3) return 'yellow'
  return 'green'
}

export const semaforoClass = (color) => ({
  red: 's3r',
  yellow: 's3y',
  green: 's3g',
}[color] || 's3g')

// ══════════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════════
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

export const estadoLabel = (estado) => ({
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  en_produccion: 'En producción',
  listo_fabrica: 'Listo fábrica',
  embarcado: 'Embarcado',
  en_transito: 'En tránsito',
  en_puerto_cr: 'En puerto CR',
  en_aduana: 'En aduana',
  en_bodega: 'En bodega',
  entregado: 'Entregado',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
}[estado] || estado)

export const estadoPillClass = (estado) => ({
  borrador: 'pill-gray',
  confirmado: 'pill-gray',
  en_produccion: 'pill-gray',
  listo_fabrica: 'pill-yellow',
  embarcado: 'pill-blue',
  en_transito: 'pill-blue',
  en_puerto_cr: 'pill-yellow',
  en_aduana: 'pill-yellow',
  en_bodega: 'pill-violet',
  entregado: 'pill-green',
  cerrado: 'pill-green',
  cancelado: 'pill-red',
}[estado] || 'pill-gray')

// ══════════════════════════════════════════════
// IMPORTACIONES
// ══════════════════════════════════════════════
export const importacionEstadoOptions = [
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'en_transito', label: 'En tránsito' },
  { value: 'en_aduana', label: 'En aduana' },
  { value: 'en_bodega', label: 'En bodega' },
  { value: 'cerrada', label: 'Cerrada' },
]

export const importacionEstadoLabel = (estado) => ({
  borrador: 'Borrador',
  en_proceso: 'En proceso',
  en_transito: 'En tránsito',
  en_aduana: 'En aduana',
  en_bodega: 'En bodega',
  cerrada: 'Cerrada',
}[estado] || estado)

export const importacionEstadoPillClass = (estado) => ({
  borrador: 'pill-gray',
  en_proceso: 'pill-blue',
  en_transito: 'pill-blue',
  en_aduana: 'pill-yellow',
  en_bodega: 'pill-green',
  cerrada: 'pill-violet',
}[estado] || 'pill-gray')

export const importacionSemaforoClass = (estado) => ({
  borrador: 's3y',
  en_proceso: 's3y',
  en_transito: 's3r',
  en_aduana: 's3y',
  en_bodega: 's3g',
  cerrada: 's3g',
}[estado] || 's3y')

// ══════════════════════════════════════════════
// HITOS
// ══════════════════════════════════════════════
export const hitoTipoLabel = (tipo) => ({
  confirmacion: 'Confirmación',
  pago_senal: 'Pago de señal',
  produccion: 'Producción',
  embarque: 'Embarque',
  llegada_cr: 'Llegada CR',
  retiro_aduana: 'Retiro aduana',
  entrega_bodega: 'Entrega bodega',
  entrega_cliente: 'Entrega cliente',
  personalizado: 'Personalizado',
}[tipo] ?? tipo)

export const hitoTipoOptions = [
  'confirmacion', 'pago_senal', 'produccion', 'embarque',
  'llegada_cr', 'retiro_aduana', 'entrega_bodega', 'entrega_cliente', 'personalizado',
].map((value) => ({ value, label: hitoTipoLabel(value) }))

export const hitoEstadoLabel = (estado) => ({
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
  vencido: 'Vencido',
}[estado] ?? estado)

export const hitoEstadoOptions = [
  'pendiente', 'en_proceso', 'completado', 'vencido',
].map((value) => ({ value, label: hitoEstadoLabel(value) }))

export const hitoEstadoPillClass = (estado) => ({
  completado: 'pill-green',
  en_proceso: 'pill-yellow',
  vencido:    'pill-red',
  pendiente:  'pill-gray',
}[estado] ?? 'pill-gray')

export const hitoDotClass = (estado) => ({
  completado: 's3 s3g',
  vencido: 's3 s3r',
  en_proceso: 's3 s3y',
}[estado] ?? 's3')

export const hitoSubtitulo = (hito) => {
  if (hito.estado === 'completado')
    return { text: `Real: ${fmtDate(hito.fecha_real)}`, color: 'var(--mist)' }
  if (hito.estado === 'vencido')
    return { text: `Vencido — ${fmtDate(hito.fecha_plan)}`, color: 'var(--rs)' }
  if (!hito.fecha_plan) return null
  const dias = differenceInDays(parseISO(hito.fecha_plan), new Date())
  const suffix = dias === 0 ? 'Hoy' : dias > 0 ? `En ${dias} día${dias === 1 ? '' : 's'}` : `Hace ${Math.abs(dias)} días`
  return { text: `Plan: ${fmtDate(hito.fecha_plan)} — ${suffix}`, color: dias <= 3 ? 'var(--am)' : 'var(--mist)' }
}

// ══════════════════════════════════════════════
// TRÁMITE ADUANA
// ══════════════════════════════════════════════
export const tramiteEstadoLabel = (estado) => ({
  pendiente:  'Pendiente',
  en_proceso: 'En proceso',
  aprobado:   'Aprobado',
  objetado:   'Objetado',
}[estado] ?? estado)

export const tramiteEstadoPillClass = (estado) => ({
  pendiente:  'pill-gray',
  en_proceso: 'pill-yellow',
  aprobado:   'pill-green',
  objetado:   'pill-red',
}[estado] ?? 'pill-gray')

export const tramiteEstadoOptions = [
  'pendiente', 'en_proceso', 'aprobado', 'objetado',
].map((value) => ({ value, label: tramiteEstadoLabel(value) }))

// ══════════════════════════════════════════════
// PAGOS
// ══════════════════════════════════════════════
export const pagoEstadoOptions = [
  { value: 'programado', label: 'Programado' },
  { value: 'procesado', label: 'Procesado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'devuelto', label: 'Devuelto' },
]

export const pagoEstadoLabel = (estado) => ({
  programado: 'Programado',
  procesado: 'Procesado',
  confirmado: 'Confirmado',
  devuelto: 'Devuelto',
}[estado] || estado)

export const pagoEstadoPillClass = (estado) => ({
  programado: 'pill-yellow',
  procesado: 'pill-blue',
  confirmado: 'pill-green',
  devuelto: 'pill-red',
}[estado] || 'pill-gray')

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

// ══════════════════════════════════════════════
// COSTEOS
// ══════════════════════════════════════════════
export const costeoEstadoLabel = (estado) => ({
  borrador:   'Borrador',
  confirmado: 'Confirmado',
  aprobado:   'Aprobado',
}[estado] ?? estado)

export const costeoEstadoPillClass = (estado) => ({
  borrador:   'pill-gray',
  confirmado: 'pill-yellow',
  aprobado:   'pill-green',
}[estado] ?? 'pill-gray')

export const costeoEstadoOptions = ['borrador', 'confirmado', 'aprobado'].map(
  (value) => ({ value, label: costeoEstadoLabel(value) }),
)

// ══════════════════════════════════════════════
// PERMISOS
// ══════════════════════════════════════════════
export const permisoTipoLabel = (tipo) => ({
  minae:  'MINAE',
  senasa: 'SENASA',
  minsa:  'Min. Salud',
  sutel:  'SUTEL',
  otro:   'Otro',
}[tipo] ?? tipo)

// ══════════════════════════════════════════════
// AUDITORIA
// ══════════════════════════════════════════════
export const accionAuditoriaLabel = (accion) => ({
  INSERT: 'Crear',
  UPDATE: 'Editar',
  DELETE: 'Eliminar',
  LOGIN:  'Ingreso',
  EXPORT: 'Exportar',
}[accion] ?? accion)

export const accionAuditoriaPillClass = (accion) => ({
  INSERT: 'pill-green',
  UPDATE: 'pill-blue',
  DELETE: 'pill-red',
  LOGIN:  'pill-yellow',
  EXPORT: 'pill-gray',
}[accion] ?? 'pill-gray')

export const auditoriaAccionOptions = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'].map(
  (value) => ({ value, label: accionAuditoriaLabel(value) }),
)

export const entidadTipoLabel = (tipo) => ({
  pedido:       'Pedido',
  proveedor:    'Proveedor',
  costeo:       'Costeo',
  usuario:      'Usuario',
  documento:    'Documento',
  importacion:  'Importación',
  pago:         'Pago',
  hito:         'Hito',
  contenedor:   'Contenedor',
  permiso:      'Permiso',
}[tipo] ?? tipo)

export const auditoriaEntidadOptions = [
  'pedido', 'proveedor', 'costeo', 'usuario',
  'documento', 'importacion', 'pago', 'hito', 'contenedor', 'permiso',
].map((value) => ({ value, label: entidadTipoLabel(value) }))

export const fmtJsonValue = (val) => {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'string') return val || '—'
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  return JSON.stringify(val)
}
