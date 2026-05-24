import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useCosteos, useCreateCosteo, useAprobarCosteo, useDeleteCosteo,
  useImportaciones, useImportacion, useTCHoy, usePedidos
} from '../../hooks/useApi'
import { fmtCurrency, fmtDate } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import api from '../../lib/api'

// ── Tipos de transporte y sus secciones
const TIPOS_TRANSPORTE = [
  { value: 'maritimo',   label: '🚢 Marítimo'    },
  { value: 'aereo',      label: '✈️ Aéreo'        },
  { value: 'terrestre',  label: '🚛 Terrestre'    },
  { value: 'multimodal', label: '🔄 Multimodal'   },
]

const SECCIONES_POR_TIPO = {
  maritimo: [
    { key: 'flete',   label: '🚢 Flete marítimo',     campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['imp_dif_iva','agente_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega'] },
    { key: 'otros_archivos', label: '📁 Otros archivos', campos: [] },
  ],
  aereo: [
    { key: 'flete',   label: '✈️ Flete aéreo',         campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['imp_dif_iva','agente_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega'] },
    { key: 'otros_archivos', label: '📁 Otros archivos', campos: [] },
  ],
  terrestre: [
    { key: 'flete',   label: '🚛 Flete terrestre',     campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['imp_dif_iva','agente_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega'] },
    { key: 'otros_archivos', label: '📁 Otros archivos', campos: [] },
  ],
  multimodal: [
    { key: 'flete',   label: '🔄 Flete principal',     campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['imp_dif_iva','agente_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega'] },
    { key: 'otros_archivos', label: '📁 Otros archivos', campos: [] },
  ],
}

const CAMPO_LABEL = {
  flete_maritimo: 'Flete',
  seguro:         'Seguro',
  imp_dif_iva:    'Impuestos dif. IVA',
  isc_pct:        'ISC %',
  agente_aduana:  'Agente aduanero',
  flete_cr:       'Flete CR',
  bodega:         'Bodega / almacenaje',
}

const ESTADO_PILL  = { borrador:'pill pill-gray', confirmado:'pill pill-yellow', aprobado:'pill pill-green' }
const ESTADO_LABEL = { borrador:'Borrador', confirmado:'Confirmado', aprobado:'Aprobado' }
const PASOS_REAL  = ['Importación', 'Transporte', 'Margen', 'Confirmar']
const PASOS_APROX = ['Pedidos', 'Transporte', 'Margen', 'Confirmar']

const schema = z.object({
  importacion_id: z.coerce.number().optional().or(z.literal('')),
  tc_usd_crc:     z.coerce.number().positive('TC requerido'),
  flete_maritimo: z.coerce.number().min(0).default(0),
  seguro:         z.coerce.number().min(0).default(0),
  imp_dif_iva:    z.coerce.number().min(0).default(0),
  isc_pct:        z.coerce.number().min(0).max(100).default(0),
  agente_aduana:  z.coerce.number().min(0).default(0),
  flete_cr:       z.coerce.number().min(0).default(0),
  bodega:         z.coerce.number().min(0).default(0),
  margen_default: z.coerce.number().min(0).max(100).default(35),
})

// ── Sección expandible del paso 2
// ── Campo individual con valor + comentario + archivo
function CampoConExtras({ campo, register, modoSeccion, esAprox, archivos, onArchivoChange }) {
  const files = archivos?.[campo] || []
  return (
    <div className="rounded-card border border-border bg-sur2 p-3 space-y-2">
      <div className="form-group">
        <label className="form-label">
          {CAMPO_LABEL[campo]}
          {esAprox && !campo.includes('pct') && (
            <span className="ml-1 text-[9px] text-am font-semibold">
              {modoSeccion === 'pct' ? '(% del FOB)' : '(USD)'}
            </span>
          )}
        </label>
        <input {...register(campo)} type="number" step="0.01" className="form-input"
          placeholder={campo.includes('pct') ? '0' : modoSeccion === 'pct' ? 'Ej: 5' : 'Ej: 1200'} />
      </div>
      <div className="form-group">
        <label className="form-label text-[10px]">💬 Comentario</label>
        <textarea {...register('comentario_' + campo)}
          className="form-input min-h-[52px] resize-none text-xs"
          placeholder="Observación opcional..." />
      </div>
      <div className="form-group">
        <label className="form-label text-[10px]">📎 Archivo</label>
        <label className="flex items-center gap-2 cursor-pointer rounded border border-dashed border-border bg-sur px-3 py-2 hover:border-tl/40 transition-colors">
          <span className="text-[10px] text-mist">
            {files.length > 0 ? files.length + ' archivo' + (files.length > 1 ? 's' : '') : 'Seleccionar archivo...'}
          </span>
          <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
            onChange={(e) => onArchivoChange?.(campo, Array.from(e.target.files || []))} />
        </label>
        {files.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-border bg-sur px-2 py-1 text-[10px]">
                <span className="text-mist truncate max-w-[160px]">📄 {f.name}</span>
                <button type="button" onClick={() => onArchivoChange?.(campo, files.filter((_,j) => j !== i))}
                  className="text-mist hover:text-rs ml-2">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SeccionCostos({ seccion, register, watch, abierta, onToggle, modoSeccion, onToggleModo, esAprox, archivos, onArchivoChange }) {
  const vals = watch()
  const tieneValor = seccion.campos.some(c => Number(vals[c]) > 0)
  const tieneArchivos = seccion.campos.length === 0
    ? (archivos?.[seccion.key] || []).length > 0
    : seccion.campos.some(c => (archivos?.[c] || []).length > 0)

  return (
    <div className="border border-border rounded-card overflow-hidden">
      <button type="button" onClick={onToggle}
        className={'w-full flex items-center justify-between px-4 py-3 text-left transition-colors ' +
          (abierta ? 'bg-tl-xl border-b border-tl/20' : 'bg-sur hover:bg-sur2')}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{seccion.label}</span>
          {tieneValor && !abierta && <span className="pill pill-green text-[9px]">✓ Con datos</span>}
          {tieneArchivos && !abierta && <span className="pill pill-blue text-[9px]">📎 Archivos</span>}
        </div>
        <div className="flex items-center gap-2">
          {esAprox && seccion.campos.length > 0 && (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {['pct','monto'].map(modo => (
                <button key={modo} type="button" onClick={() => onToggleModo(modo)}
                  className={'text-[9px] font-bold px-2 py-0.5 rounded transition-colors ' +
                    (modoSeccion === modo ? 'bg-am text-white' : 'bg-sur2 text-mist hover:bg-sur3')}>
                  {modo === 'pct' ? '% FOB' : '$ Monto'}
                </button>
              ))}
            </div>
          )}
          <span className="text-mist text-xs">{abierta ? '▲' : '▼'}</span>
        </div>
      </button>
      {abierta && (
        <div className="p-4 space-y-3 bg-sur fade-up">
          {seccion.campos.length === 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] text-mist">Adjuntá archivos adicionales de esta importación</div>
              <label className="flex items-center gap-2 cursor-pointer rounded-card border border-dashed border-border bg-sur2 px-3 py-3 hover:border-tl/40 transition-colors">
                <span className="text-xs text-mist">📎 Seleccionar archivos...</span>
                <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.zip"
                  onChange={(e) => onArchivoChange?.(seccion.key, [
                    ...(archivos?.[seccion.key] || []),
                    ...Array.from(e.target.files || [])
                  ])} />
              </label>
              {(archivos?.[seccion.key] || []).length > 0 && (
                <div className="space-y-1">
                  {(archivos[seccion.key] || []).map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-border bg-sur px-2 py-1.5 text-[10px]">
                      <span className="text-mist truncate max-w-[200px]">📄 {f.name} <span className="text-[9px]">({(f.size/1024).toFixed(1)} KB)</span></span>
                      <button type="button"
                        onClick={() => onArchivoChange?.(seccion.key, (archivos[seccion.key]||[]).filter((_,j) => j !== i))}
                        className="text-mist hover:text-rs ml-2">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {esAprox && (
                <div className="rounded border border-am/20 bg-yellow-50 px-3 py-1.5 text-[10px] text-am font-medium">
                  {modoSeccion === 'pct' ? '📊 Porcentaje sobre el FOB total' : '💵 Monto fijo en USD'}
                </div>
              )}
              {seccion.campos.map(campo => (
                <CampoConExtras key={campo} campo={campo} register={register}
                  modoSeccion={modoSeccion} esAprox={esAprox}
                  archivos={archivos} onArchivoChange={onArchivoChange} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Resumen lateral
function ResumenLateral({ fob, cif, val_cif, arancel, isc, otros, total, tc, tcFecha, margen, pvTotal, utilidad }) {
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="card-header"><div className="card-title">📊 Resumen del costeo</div></div>
        <div className="p-4 space-y-2">
          {[
            ['Costo origen (FOB)', fmtCurrency(fob,'USD'), false],
            ['Flete + seguro',     fmtCurrency(cif,'USD'), false],
            ['Valor CIF',         fmtCurrency(val_cif,'USD'), true],
            ['Arancel',           fmtCurrency(arancel,'USD'), false],
            ['Agente + otros CR', fmtCurrency(otros,'USD'), false],
          ].map(([l,v,hl]) => (
            <div key={l} className="flex justify-between py-1 border-b border-border-lt text-xs">
              <span className="text-mist">{l}</span>
              <span className={`font-semibold ${hl ? 'text-tl' : ''}`}>{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t-2 border-border">
            <span className="font-semibold text-sm">Costo total CR</span>
            <span className="font-bold text-base text-ink">{fmtCurrency(total,'USD')}</span>
          </div>
          {pvTotal > 0 && (
            <div className="bg-gd-l rounded-card p-3 mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gd">Precio venta total ({margen}%)</span>
                <span className="font-bold text-gd">{fmtCurrency(pvTotal,'USD')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-mist">Utilidad bruta</span>
                <span className="font-semibold text-sg">{fmtCurrency(utilidad,'USD')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">💱 Tipo de cambio</div></div>
        <div className="p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-mist">USD/CRC</span>
            <span className="font-semibold">₡{Number(tc||0).toLocaleString('es-CR',{minimumFractionDigits:2})}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mist">Fuente</span>
            <span className="pill pill-blue">BCCR</span>
          </div>
          {tcFecha && (
            <div className="flex justify-between">
              <span className="text-mist">Fecha</span>
              <span>{fmtDate(tcFecha)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Resumen de pedidos para encabezado del paso 1 y 2
function ResumenPedidos({ pedidos = [], lineas = [], tipoCosteo, pedidosSel, todosPedidos = [] }) {
  const pedidosMostrar = tipoCosteo === 'aproximacion'
    ? todosPedidos.filter(p => pedidosSel.includes(p.pedido_id))
    : pedidos

  if (!pedidosMostrar.length) return null

  const proveedores = [...new Set(pedidosMostrar.map(p => p.proveedor?.nombre).filter(Boolean))]

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">📋 Información de pedidos</div>
        <span className="text-[10px] text-mist">{pedidosMostrar.length} pedido{pedidosMostrar.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-mist w-20 shrink-0">Proveedores</span>
          <div className="flex flex-wrap gap-1">
            {proveedores.map(p => (
              <span key={p} className="pill pill-blue text-[9px]">{p}</span>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {pedidosMostrar.map(p => {
            const fob = (p.lineas || []).reduce((s,l) => s + Number(l.total_linea||0), 0)
            return (
              <div key={p.pedido_id} className="rounded-card border border-border bg-sur2 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">{p.codigo}</span>
                  <span className={`pill text-[9px] ${p.estado === 'confirmado' ? 'pill-green' : p.estado === 'borrador' ? 'pill-gray' : 'pill-yellow'}`}>{p.estado}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-mist">
                  <span>{p._count?.lineas ?? p.lineas?.length ?? 0} líneas</span>
                  {p.fecha_pedido && <span>📅 {new Date(p.fecha_pedido).toLocaleDateString('es-CR')}</span>}
                  {fob > 0 && <span className="font-semibold text-tl">FOB {fob.toLocaleString('es-CR',{minimumFractionDigits:2})} {p.moneda}</span>}
                </div>
              </div>
            )
          })}
        </div>
        {lineas.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-mist uppercase tracking-wider">Productos y líneas</div>
            <div className="rounded-card border border-border overflow-hidden">
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr className="bg-sur2">
                    <th className="text-[9px] font-semibold text-mist px-2 py-1.5 text-left">Producto</th>
                    <th className="text-[9px] font-semibold text-mist px-2 py-1.5 text-left">SKU</th>
                    <th className="text-[9px] font-semibold text-mist px-2 py-1.5 text-right">Cant.</th>
                    <th className="text-[9px] font-semibold text-mist px-2 py-1.5 text-right">P. Unit</th>
                    <th className="text-[9px] font-semibold text-mist px-2 py-1.5 text-right">Total línea</th>
                    <th className="text-[9px] font-semibold text-mist px-2 py-1.5 text-left">Pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const ped = pedidosMostrar.find(p => p.pedido_id === l.pedido_id)
                    return (
                      <tr key={l.linea_id || i} className="border-t border-border-lt hover:bg-sur2/50">
                        <td className="px-2 py-1.5">
                          <div className="text-[10px] font-medium text-ink">{l.producto?.nombre || '—'}</div>
                          {l.producto?.categoria && <div className="text-[9px] text-mist">{l.producto.categoria}</div>}
                        </td>
                        <td className="px-2 py-1.5"><code className="text-[9px] bg-sur2 px-1 rounded">{l.producto?.sku || '—'}</code></td>
                        <td className="px-2 py-1.5 text-[10px] text-right font-semibold text-ink">{Number(l.cantidad||0).toLocaleString('en')}</td>
                        <td className="px-2 py-1.5 text-[10px] text-right text-mist">{Number(l.precio_unit||0).toLocaleString('es-CR',{minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1.5 text-[10px] text-right font-semibold text-tl">{Number(l.total_linea||0).toLocaleString('es-CR',{minimumFractionDigits:2})}</td>
                        <td className="px-2 py-1.5 text-[9px] text-mist">{ped?.codigo || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-sur2 border-t-2 border-border">
                    <td colSpan={2} className="px-2 py-1.5 text-[9px] font-semibold text-mist">TOTAL</td>
                    <td className="px-2 py-1.5 text-[10px] text-right font-bold text-ink">{lineas.reduce((s,l) => s + Number(l.cantidad||0), 0).toLocaleString('en')}</td>
                    <td />
                    <td className="px-2 py-1.5 text-[10px] text-right font-bold text-tl">{lineas.reduce((s,l) => s + Number(l.total_linea||0), 0).toLocaleString('es-CR',{minimumFractionDigits:2})}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
// ── Componente principal
export default function CosteosPage() {
  const qc                          = useQueryClient()
  const location                    = useLocation()
  const [modoWizard, setModoWizard] = useState(false)
  const [costeoEdit, setCosteoEdit] = useState(null) // costeo en edición
  const [paso,       setPaso]       = useState(1)
  const [tipoTransp, setTipoTransp] = useState('maritimo')
  const [seccionAb,  setSeccionAb]  = useState('flete') // sección abierta
  const [conIVI,     setConIVI]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [confirmApr, setConfirmApr] = useState(null)
  const [archivos,   setArchivos]   = useState({})
  const [tipoCosteo, setTipoCosteo] = useState(null)
  const [pedidosSel, setPedidosSel] = useState([])
  const [modosCosto, setModosCosto] = useState({ flete: 'monto', aduana: 'monto', local: 'monto' })
  const [modoTC,       setModoTC]       = useState('bccr')
  const [monedaCosteo, setMonedaCosteo] = useState('USD') // 'USD' | 'CRC'
  const [otrosEntradas, setOtrosEntradas] = useState([{ id: Date.now(), monto: '', nota: '', archivo: null }])

  const { data: costeos      = [], isLoading } = useCosteos()
  const { data: importaciones = [] }           = useImportaciones()
  const { data: pedidos       = [] }           = usePedidos()
  const { data: tcHoy }                        = useTCHoy()

  const { mutate: crearCosteo,   isPending: creando   } = useCreateCosteo()
  const { mutate: aprobarCosteo                        } = useAprobarCosteo()
  const { mutate: eliminarCosteo                       } = useDeleteCosteo()

  const { mutate: crearAproximacion, isPending: creandoAprox } = useMutation({
    mutationFn: (data) => api.post('/costeos/aproximacion', data),
  })

  const { mutate: editarCosteo, isPending: editando } = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/costeos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['costeos'] })
      cerrarWizard()
    }
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tc_usd_crc:'', flete_maritimo:0, seguro:0, arancel_pct:0,
      isc_pct:0, agente_aduana:0, flete_cr:0, bodega:0,
      margen_default:35,
    }
  })

  useEffect(() => {
    if (tcHoy?.usd_crc) setValue('tc_usd_crc', tcHoy.usd_crc)
  }, [tcHoy])

  useEffect(() => {
    const state = location?.state
    if (!state) return
    if (state.tipo === 'aproximacion' && state.pedido_ids?.length) {
      setTipoCosteo('aproximacion')
      setPedidosSel(state.pedido_ids)
      setPaso(2)
      setModoWizard(true)
      window.history.replaceState({}, '')
    } else if (state.importacion_ids?.length) {
      setTipoCosteo('real')
      setValue('importacion_id', state.importacion_ids[0])
      setPaso(2)
      setModoWizard(true)
      window.history.replaceState({}, '')
    }
  }, [])

  // Leer state de navegación — viene de PedidosPage con aproximación preseleccionada
  useEffect(() => {
    const state = location.state
    if (!state) return
    if (state.tipo === 'aproximacion' && state.pedido_ids?.length) {
      setTipoCosteo('aproximacion')
      setPedidosSel(state.pedido_ids)
      setPaso(2) // saltar directo al paso de transporte
      setModoWizard(true)
      window.history.replaceState({}, '')
    } else if (state.importacion_ids?.length) {
      setTipoCosteo('real')
      setValue('importacion_id', state.importacion_ids[0])
      setPaso(2)
      setModoWizard(true)
      window.history.replaceState({}, '')
    }
  }, [])

  const w = watch()
  const importacionSelId = w?.importacion_id ? Number(w.importacion_id) : null
  const { data: importacionSel } = useImportacion(importacionSelId)

  // ── Cálculos
  const impSel    = importacionSel || importaciones.find(i => i.importacion_id === Number(w.importacion_id))
  const lineas    = impSel?.pedidos?.flatMap(p => p.lineas || []) || []

  const lineasAprox   = tipoCosteo === 'aproximacion'
    ? pedidos.filter(p => pedidosSel.includes(p.pedido_id)).flatMap(p => p.lineas || [])
    : []
  const lineasActivas = tipoCosteo === 'aproximacion' ? lineasAprox : lineas

  const fob_usd   = lineasActivas.reduce((s,l) => s + Number(l.total_linea || 0), 0)
  const tc_val    = Number(w.tc_usd_crc) || 1
  const fob_total = monedaCosteo === 'CRC' ? fob_usd * tc_val : fob_usd
  const cif       = (Number(w.flete_maritimo)||0) + (Number(w.seguro)||0)
  const val_cif   = fob_total + cif
  const arancel   = (Number(w.imp_dif_iva)||0)
  const isc       = val_cif * ((Number(w.isc_pct)||0)/100)
  const otrosMonto = otrosEntradas.reduce((s,e) => s + (Number(e.monto)||0), 0)
  const otros      = (Number(w.agente_aduana)||0)+(Number(w.flete_cr)||0)+(Number(w.bodega)||0)+otrosMonto
  const total_cr  = val_cif + arancel + isc + otros
  const margen    = Number(w.margen_default) || 35

  const pesoTotal = lineasActivas.reduce((s,l) => s + Number(l.peso_total_kg||0), 0)

  const calcLinea = (l) => {
    const fobLinea     = Number(l.total_linea || 0)
    const cant         = Number(l.cantidad) || 1
    const pesoLinea    = Number(l.peso_total_kg || 0)
    const pct          = pesoTotal > 0
      ? (pesoLinea / pesoTotal)
      : (fob_total > 0 ? fobLinea / fob_total : 0)

    const fobUnit      = fobLinea / cant
    const fleteSeguro  = cif * pct
    const cifLinea     = fobLinea + fleteSeguro
    const impLinea     = arancel * pct
    const agenteLinea  = (Number(w.agente_aduana)||0) * pct
    const fleteCrLinea = (Number(w.flete_cr)||0) * pct
    const bodegaLinea  = (Number(w.bodega)||0) * pct
    const otrosLinea   = otrosMonto * pct
    const costoTotal   = cifLinea + impLinea + agenteLinea + fleteCrLinea + bodegaLinea + otrosLinea
    const costoUnitCR  = costoTotal / cant
    const pVentaUnit   = costoUnitCR * (1 + margen/100) * (conIVI ? 1.13 : 1)
    const pVentaTotal  = pVentaUnit * cant

    return { fobLinea, fobUnit, fleteSeguro, cifLinea, impLinea, agenteLinea, fleteCrLinea, bodegaLinea, otrosLinea, costoTotal, costoUnitCR, pVentaUnit, pVentaTotal }
  }

  const pvTotal  = lineasActivas.reduce((s,l) => s + calcLinea(l).pVentaTotal, 0)
  const utilidad = lineasActivas.reduce((s,l) => s + (calcLinea(l).pVentaTotal - calcLinea(l).costoTotal), 0)

  const abrirCrear = () => {
    setCosteoEdit(null)
    reset()
    if (tcHoy?.valor) setValue('tc_usd_crc', tcHoy.valor)
    setTipoTransp('maritimo')
    setSeccionAb('flete')
    setTipoCosteo(null)
    setPedidosSel([])
    setModosCosto({ flete: 'monto', aduana: 'monto', local: 'monto' })
    setModoTC('bccr')
    setPaso(0)
    setArchivos({})
    setModoWizard(true)
  }

  const abrirEditar = (c) => {
    setCosteoEdit(c)
    setTipoCosteo(c.tipo === 'aproximacion' ? 'aproximacion' : 'real')
    const impId = c.importacion_id || c.importaciones_rel?.[0]?.importacion_id || ''
    reset({
      importacion_id: impId,
      tc_usd_crc:     Number(c.tc_usd_crc),
      flete_maritimo: Number(c.flete_maritimo)||0,
      seguro:         Number(c.seguro)||0,
      imp_dif_iva:    Number(c.arancel_monto)||0,
      isc_pct:        Number(c.isc_pct)||0,
      agente_aduana:  Number(c.agente_aduana)||0,
      flete_cr:       Number(c.flete_cr)||0,
      bodega:         Number(c.bodega_costo)||0,
      margen_default: Number(c.margen_global)||35,
    })
    setTipoTransp('maritimo')
    setSeccionAb('flete')
    setPaso(2)
    setModoWizard(true)
  }

  const cerrarWizard = () => {
    setModoWizard(false); setCosteoEdit(null); setPaso(0)
    setTipoCosteo(null); setPedidosSel([]); setArchivos({})
    reset()
  }

  // Guardar notas y archivos después de crear el costeo
  const guardarExtras = async (costeo_id, data) => {
    try {
      // 1. Recopilar notas de los campos
      const detalles = Object.keys(data)
        .filter(k => k.startsWith('comentario_') && data[k])
        .map(k => ({ campo: k.replace('comentario_', ''), nota: data[k] }))

      if (detalles.length) {
        await api.post(`/costeos/${costeo_id}/detalles`, { detalles })
      }

      // 2. Subir archivos por campo
      for (const [campo, files] of Object.entries(archivos)) {
        if (!files?.length) continue
        for (const file of files) {
          const fd = new FormData()
          fd.append('archivo', file)
          fd.append('campo', campo)
          await api.post(`/costeos/${costeo_id}/archivos`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
      }
    } catch (e) {
      console.error('Error guardando extras del costeo:', e)
    }
  }

  const onSubmit = (data) => {
    if (costeoEdit) {
      editarCosteo({ id: costeoEdit.costeo_id, data: {
        tc_usd_crc:    Number(data.tc_usd_crc),
        flete_maritimo: Number(data.flete_maritimo),
        seguro:         Number(data.seguro),
        arancel_monto:  Number(data.imp_dif_iva),
        isc_pct:        Number(data.isc_pct),
        agente_aduana:  Number(data.agente_aduana),
        flete_cr:       Number(data.flete_cr),
        bodega_costo:   Number(data.bodega),
        otros_costos:   otrosEntradas.reduce((s,e)=>s+(Number(e.monto)||0),0),
        margen_global:  Number(data.margen_default),
      }})
    } else if (tipoCosteo === 'aproximacion') {
      crearAproximacion({
        pedido_ids:      pedidosSel,
        tc_usd_crc:      Number(data.tc_usd_crc),
        flete_maritimo:  Number(data.flete_maritimo),
        flete_es_pct:    modosCosto.flete  === 'pct',
        seguro:          Number(data.seguro),
        seguro_es_pct:   modosCosto.flete  === 'pct',
        arancel_pct:     Number(data.imp_dif_iva),
        isc_pct:         Number(data.isc_pct),
        agente_aduana:   Number(data.agente_aduana),
        agente_es_pct:   modosCosto.aduana === 'pct',
        flete_cr:        Number(data.flete_cr),
        flete_cr_es_pct: modosCosto.local  === 'pct',
        bodega_costo:    Number(data.bodega),
        bodega_es_pct:   modosCosto.local  === 'pct',
        otros_costos:    Number(data.otros_cr) + Number(data.otros_aduana),
        otros_es_pct:    false,
        margen_global:   Number(data.margen_default),
      }, {
        onSuccess: async (res) => {
          const costeo_id = res?.data?.costeo_id || res?.costeo_id
          if (costeo_id) await guardarExtras(costeo_id, data)
          qc.invalidateQueries({ queryKey: ['costeos'] })
          cerrarWizard()
        }
      })
    } else {
      crearCosteo(data, {
        onSuccess: async (res) => {
          const costeo_id = res?.data?.costeo_id || res?.costeo_id
          if (costeo_id) await guardarExtras(costeo_id, data)
          qc.invalidateQueries({ queryKey: ['costeos'] })
          cerrarWizard()
        }
      })
    }
  }

  const secciones = SECCIONES_POR_TIPO[tipoTransp] || []

  // ── KPIs
  const aprobados    = costeos.filter(c => c.estado === 'aprobado').length
  const borradores   = costeos.filter(c => c.estado === 'borrador').length
  const totalAprobado= costeos.filter(c => c.estado === 'aprobado').reduce((s,c) => s + (Number(c.costo_total_cr)||0), 0)

  // ── WIZARD
  if (modoWizard) return (
    <div className="space-y-4">
      {/* Header wizard */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-ink">
            {costeoEdit ? 'Editar costeo' : 'Nuevo costeo'}
          </div>
          <div className="text-xs text-mist">
            {impSel ? `${impSel.codigo} · ${impSel.pedidos?.map(p=>p.codigo).join(' + ')}` : 'Seleccioná una importación'}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline text-xs" onClick={cerrarWizard}>← Volver</button>
          {paso === 4 && (
            <button className="btn btn-primary text-xs" onClick={handleSubmit(onSubmit)} disabled={creando||editando}>
              {creando||editando ? 'Guardando...' : costeoEdit ? '✓ Guardar cambios' : '✓ Crear costeo'}
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-2">
        {(tipoCosteo === 'aproximacion' ? PASOS_APROX : PASOS_REAL).map((p,i) => (
          <div key={p} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold transition-all
                ${i+1 < paso ? 'bg-tl border-tl text-white' : i+1===paso ? 'bg-ink border-ink text-white' : 'bg-white border-border text-mist'}`}>
                {i+1 < paso ? '✓' : i+1}
              </div>
              <div className={`text-[9.5px] mt-1 ${i+1===paso?'text-ink font-semibold':i+1<paso?'text-tl':'text-mist'}`}>{p}</div>
            </div>
            {i < (tipoCosteo === 'aproximacion' ? PASOS_APROX : PASOS_REAL).length-1 && <div className={`flex-1 h-0.5 mx-1 mb-3.5 ${i+1<paso?'bg-tl':'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* ── PASO 0: Tipo de costeo */}
      {paso === 0 && (
        <div className="card max-w-xl mx-auto">
          <div className="card-header"><div className="card-title">¿Qué tipo de costeo querés crear?</div></div>
          <div className="p-6 space-y-3">
            <button className="w-full rounded-card border-2 border-border bg-sur hover:border-tl hover:bg-tl-xl transition-all p-4 text-left space-y-1"
              onClick={() => { setTipoCosteo('real'); setPaso(1) }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🚢</span>
                <span className="font-semibold text-ink">Costeo real</span>
              </div>
              <div className="text-xs text-mist pl-7">Basado en importaciones existentes. Usa los pedidos y líneas asociadas a la importación.</div>
            </button>
            <button className="w-full rounded-card border-2 border-border bg-sur hover:border-am hover:bg-yellow-50 transition-all p-4 text-left space-y-1"
              onClick={() => { setTipoCosteo('aproximacion'); setPaso(1) }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧮</span>
                <span className="font-semibold text-ink">Aproximación de costeo</span>
              </div>
              <div className="text-xs text-mist pl-7">Estimación basada en pedidos directos. Cada sección puede manejarse como % del FOB o monto fijo.</div>
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 1 APROXIMACIÓN: Seleccionar pedidos */}
      {paso === 1 && tipoCosteo === 'aproximacion' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🧮 Seleccioná los pedidos</div>
            <span className="text-xs text-mist">{pedidosSel.length} seleccionado{pedidosSel.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {pedidos.filter(p => !['cancelado','cerrado'].includes(p.estado)).map(p => {
                const sel = pedidosSel.includes(p.pedido_id)
                const fob = (p.lineas || []).reduce((s,l) => s + Number(l.total_linea||0), 0)
                return (
                  <div key={p.pedido_id}
                    onClick={() => setPedidosSel(prev => sel ? prev.filter(x => x !== p.pedido_id) : [...prev, p.pedido_id])}
                    className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2.5 transition-all
                      ${sel ? 'border-tl bg-tl-xl' : 'border-border bg-sur hover:border-tl/40'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${sel ? 'border-tl bg-tl' : 'border-border'}`}>
                        {sel && <span className="text-[9px] font-bold text-white">✓</span>}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{p.codigo}</div>
                        <div className="text-[10px] text-mist">{p.proveedor?.nombre} · {p._count?.lineas ?? 0} líneas · {fmtCurrency(fob,'USD')}</div>
                      </div>
                    </div>
                    {p.importacion_id && <span className="text-[9px] text-am font-semibold">🚢 En importación</span>}
                  </div>
                )
              })}
            </div>
            {pedidosSel.length > 0 && (
              <div className="rounded-card border border-tl/20 bg-tl-xl px-3 py-2 text-xs flex justify-between">
                <span className="text-mist">FOB estimado total</span>
                <span className="font-bold text-tl">
                  {fmtCurrency(pedidos.filter(p => pedidosSel.includes(p.pedido_id)).flatMap(p => p.lineas||[]).reduce((s,l) => s + Number(l.total_linea||0), 0), 'USD')}
                </span>
              </div>
            )}
            {pedidosSel.length > 0 && (
              <ResumenPedidos
                pedidos={[]}
                lineas={lineasAprox}
                tipoCosteo="aproximacion"
                pedidosSel={pedidosSel}
                todosPedidos={pedidos}
              />
            )}
            <div className="flex justify-between">
              <button className="btn btn-outline text-xs" onClick={() => { setTipoCosteo(null); setPaso(0) }}>← Atrás</button>
              <button className="btn btn-primary text-xs" disabled={pedidosSel.length === 0} onClick={() => setPaso(2)}>Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 1 REAL: Importación */}
      {paso === 1 && tipoCosteo === 'real' && (
        <div className="card">
          <div className="card-header"><div className="card-title">🚢 Seleccioná la importación</div></div>
          <div className="p-4 space-y-3">
            <div className="form-group">
              <label className="form-label">Importación *</label>
              <select {...register('importacion_id')} className="form-input">
                <option value="">— Seleccioná —</option>
                {importaciones.filter(i => i.estado !== 'cerrada').map(i => (
                  <option key={i.importacion_id} value={i.importacion_id}>
                    {i.codigo} — {i.pedidos?.map(p=>p.codigo).join(' + ')}
                  </option>
                ))}
              </select>
              {errors.importacion_id && <span className="text-xs text-rs">{errors.importacion_id.message}</span>}
            </div>
            {impSel && (
              <div className="bg-tl-xl border border-tl/20 rounded-card p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-mist">Pedidos</span><span className="font-medium">{impSel.pedidos?.length||0}</span></div>
                <div className="flex justify-between"><span className="text-mist">Líneas</span><span className="font-medium">{lineas.length}</span></div>
                <div className="flex justify-between"><span className="text-mist">FOB estimado</span><span className="font-semibold text-tl">{fmtCurrency(fob_total,'USD')}</span></div>
              </div>
            )}
            {impSel && (
              <ResumenPedidos
                pedidos={impSel.pedidos || []}
                lineas={lineas}
                tipoCosteo="real"
                pedidosSel={[]}
                todosPedidos={[]}
              />
            )}
            
            <div className="flex justify-between">
              <button className="btn btn-outline text-xs" onClick={() => { setTipoCosteo(null); setPaso(0) }}>← Atrás</button>
              <button className="btn btn-primary text-xs" onClick={() => { if (w.importacion_id) setPaso(2) }}>Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 2: Transporte por secciones */}
      {paso === 2 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">

            {/* Resumen de pedidos */}
            <ResumenPedidos
              pedidos={impSel?.pedidos || []}
              lineas={lineasActivas}
              tipoCosteo={tipoCosteo}
              pedidosSel={pedidosSel}
              todosPedidos={pedidos}
            />

            {/* Tipo de transporte */}
            <div className="card">
              <div className="card-header"><div className="card-title">🚛 Tipo de transporte</div></div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {TIPOS_TRANSPORTE.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setTipoTransp(t.value); setSeccionAb('flete') }}
                      className={`rounded-card border px-3 py-2.5 text-xs font-medium transition-all text-center
                        ${tipoTransp===t.value ? 'border-tl bg-tl-xl text-tl' : 'border-border bg-sur hover:border-tl/40'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Moneda del costeo */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Costeo en</div>
                <div className="flex gap-1">
                  {['USD','CRC'].map(m => (
                    <button key={m} type="button"
                      onClick={() => setMonedaCosteo(m)}
                      className={`text-[10px] font-semibold px-3 py-1 rounded transition-colors
                        ${monedaCosteo === m ? 'bg-tl text-white' : 'bg-sur2 text-mist hover:bg-sur3'}`}>
                      {m === 'USD' ? '🇺🇸 Dólares' : '🇨🇷 Colones'}
                    </button>
                  ))}
                </div>
              </div>
              {monedaCosteo === 'CRC' && (
                <div className="px-4 pb-3 text-[10px] text-am bg-yellow-50 border-t border-am/20 py-2">
                  Los montos se ingresan en CRC. El FOB en USD se convierte usando el TC.
                </div>
              )}
            </div>

            {/* TC */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">💱 Tipo de cambio USD/CRC</div>
                <div className="flex gap-1">
                  {['bccr','manual'].map(modo => (
                    <button key={modo} type="button"
                      onClick={() => {
                        setModoTC(modo)
                        if (modo === 'bccr' && tcHoy?.usd_crc) setValue('tc_usd_crc', tcHoy.usd_crc)
                      }}
                      className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors
                        ${modoTC === modo ? 'bg-tl text-white' : 'bg-sur2 text-mist hover:bg-sur3'}`}>
                      {modo === 'bccr' ? '🏦 BCCR' : '✏️ Manual'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {modoTC === 'bccr' ? (
                  <div className="rounded-card border border-tl/20 bg-tl-xl px-3 py-2.5 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-tl">TC del día</div>
                      {tcHoy?.fecha && <div className="text-[10px] text-mist">{fmtDate(tcHoy.fecha)}</div>}
                    </div>
                    <div className="font-bold text-ink">₡{Number(tcHoy?.usd_crc||0).toLocaleString('es-CR',{minimumFractionDigits:2})}</div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">TC USD/CRC *</label>
                    <input {...register('tc_usd_crc')} type="number" step="0.01" className="form-input" placeholder="Ej: 518.50" />
                  </div>
                )}
              </div>
            </div>

            {/* Secciones de costos */}
            <div className="space-y-2">
              {secciones.map(sec => (
                <SeccionCostos
                  key={sec.key}
                  seccion={sec}
                  register={register}
                  watch={watch}
                  abierta={seccionAb === sec.key}
                  onToggle={() => setSeccionAb(prev => prev === sec.key ? null : sec.key)}
                  modoSeccion={modosCosto[sec.key] || 'monto'}
                  onToggleModo={(modo) => setModosCosto(prev => ({ ...prev, [sec.key]: modo }))}
                  esAprox={tipoCosteo === 'aproximacion'}
                  archivos={archivos}
                  onArchivoChange={(key, files) => setArchivos(prev => ({ ...prev, [key]: files }))}
                />
              ))}
            </div>



            {/* Sección Otros — múltiples entradas */}
            <div className="border border-border rounded-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-sur">
                <span className="text-sm">📋 Otros costos</span>
                <button type="button" className="text-[10px] font-semibold text-tl hover:underline"
                  onClick={() => setOtrosEntradas(prev => [...prev, { id: Date.now(), monto: '', nota: '', archivo: null }])}>
                  ＋ Agregar
                </button>
              </div>
              <div className="p-4 space-y-3">
                {otrosEntradas.map((entrada, idx) => (
                  <div key={entrada.id} className="rounded-card border border-border bg-sur2 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-mist">Entrada {idx + 1}</span>
                      {otrosEntradas.length > 1 && (
                        <button type="button" className="text-[9px] text-mist hover:text-rs"
                          onClick={() => setOtrosEntradas(prev => prev.filter(e => e.id !== entrada.id))}>
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label text-[10px]">
                        Monto {monedaCosteo === 'CRC' ? '(CRC)' : '(USD)'}
                      </label>
                      <input type="number" step="0.01" className="form-input" placeholder="0.00"
                        value={entrada.monto}
                        onChange={e => setOtrosEntradas(prev => prev.map(x => x.id === entrada.id ? {...x, monto: e.target.value} : x))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-[10px]">💬 Comentario</label>
                      <textarea className="form-input min-h-[52px] resize-none text-xs" placeholder="Descripción del costo..."
                        value={entrada.nota}
                        onChange={e => setOtrosEntradas(prev => prev.map(x => x.id === entrada.id ? {...x, nota: e.target.value} : x))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-[10px]">📎 Archivo</label>
                      <label className="flex items-center gap-2 cursor-pointer rounded border border-dashed border-border bg-sur px-3 py-2 hover:border-tl/40 transition-colors">
                        <span className="text-[10px] text-mist">{entrada.archivo?.name || 'Seleccionar archivo...'}</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                          onChange={e => setOtrosEntradas(prev => prev.map(x => x.id === entrada.id ? {...x, archivo: e.target.files?.[0]||null} : x))} />
                      </label>
                      {entrada.archivo && (
                        <div className="text-[9px] text-mist mt-1">📄 {entrada.archivo.name}</div>
                      )}
                    </div>
                  </div>
                ))}
                {otrosEntradas.length > 0 && (
                  <div className="rounded-card border border-border bg-sur px-3 py-2 text-xs flex justify-between">
                    <span className="text-mist">Total otros costos</span>
                    <span className="font-bold">{monedaCosteo === 'CRC' ? '₡' : 'USD '}{otrosEntradas.reduce((s,e)=>s+(Number(e.monto)||0),0).toLocaleString('es-CR',{minimumFractionDigits:2})}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Costo total */}
            <div className="flex justify-end">
              <div className="bg-sur2 border border-border rounded-card px-4 py-2 flex items-center gap-4">
                <span className="text-xs text-mist">Costo total CR</span>
                <span className="text-base font-bold text-ink">{fmtCurrency(total_cr,'USD')}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <button className="btn btn-outline text-xs" onClick={() => setPaso(1)}>← Atrás</button>
              <button className="btn btn-primary text-xs" onClick={() => setPaso(3)}>Siguiente →</button>
            </div>
          </div>
          <ResumenLateral fob={fob_total} cif={cif} val_cif={val_cif} arancel={arancel} isc={isc} otros={otros} total={total_cr} tc={w.tc_usd_crc} tcFecha={tcHoy?.fecha} />
        </div>
      )}

      {/* ── PASO 3: Margen */}
      {paso === 3 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Margen y precio de venta</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate font-semibold">Margen global:</span>
                  <input {...register('margen_default')} type="number" step="1" min="0" max="100"
                    className="w-16 h-8 border border-border rounded-md text-center text-xs outline-none focus:border-tl" />
                  <span className="text-xs text-mist">%</span>
                  <div className="flex items-center gap-1.5 bg-tl-l border border-tl/20 rounded-card px-2 py-1">
                    <input type="checkbox" id="con-ivi" checked={conIVI} onChange={e => setConIVI(e.target.checked)} className="accent-tl w-3 h-3" />
                    <label htmlFor="con-ivi" className="text-xs font-semibold text-tl cursor-pointer">Con IVI</label>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {lineasActivas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-mist">
                    {tipoCosteo === 'aproximacion' ? 'No hay líneas en los pedidos seleccionados' : 'No hay líneas de producto en esta importación'}
                  </div>
                ) : (
                  <table style={{minWidth:'1100px',width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr className="bg-sur2">
                        {[
                          {h:'Producto',           w:'180px'},
                          {h:'Cant.',              w:'60px'},
                          {h:'FOB unit',           w:'90px'},
                          {h:'Flete + Seguro',     w:'100px'},
                          {h:'Costo CIF',          w:'100px'},
                          {h:'Imp. dif. IVA',      w:'95px'},
                          {h:'Agente',             w:'85px'},
                          {h:'Flete CR',           w:'85px'},
                          {h:'Bodega',             w:'80px'},
                          {h:'Otros',              w:'80px'},
                          {h:'Costo total',        w:'100px'},
                          {h:'Costo unit CR',      w:'100px'},
                          {h:'Margen %',           w:'75px'},
                          {h:'P. Venta unit',      w:'100px'},
                        ].map(({h,w}) => (
                          <th key={h} style={{minWidth:w}} className="text-[9px] font-semibold text-mist uppercase tracking-wider px-2 py-2 text-right border-b border-border first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineasActivas.map((l,i) => {
                        const c = calcLinea(l)
                        const moneda = monedaCosteo === 'CRC' ? 'CRC' : 'USD'
                        const fmt = (v) => fmtCurrency(v, moneda)
                        return (
                          <tr key={l.linea_id||i} className="border-b border-border-lt hover:bg-sur2/50">
                            <td className="px-2 py-2 text-left">
                              <div className="font-medium text-xs">{l.producto?.nombre||l.producto_id}</div>
                              <div className="text-[9px] text-mist">{l.producto?.sku}</div>
                            </td>
                            <td className="px-2 py-2 text-xs text-right">{Number(l.cantidad).toLocaleString('en')}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.fobUnit)}</td>
                            <td className="px-2 py-2 text-xs text-right text-mist">{fmt(c.fleteSeguro)}</td>
                            <td className="px-2 py-2 text-xs text-right font-semibold text-tl">{fmt(c.cifLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.impLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.agenteLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.fleteCrLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.bodegaLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right">{fmt(c.otrosLinea)}</td>
                            <td className="px-2 py-2 text-xs text-right font-bold text-ink">{fmt(c.costoTotal)}</td>
                            <td className="px-2 py-2 text-xs text-right font-semibold">{fmt(c.costoUnitCR)}</td>
                            <td className="px-2 py-2 text-xs text-right">{margen}%</td>
                            <td className="px-2 py-2 text-xs text-right font-bold text-gd">{fmt(c.pVentaUnit)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      {/* Fila de sumatoria */}
                      {(() => {
                        const tots = lineasActivas.reduce((acc, l) => {
                          const c = calcLinea(l)
                          return {
                            fobLinea:     acc.fobLinea     + c.fobLinea,
                            fleteSeguro:  acc.fleteSeguro  + c.fleteSeguro,
                            cifLinea:     acc.cifLinea     + c.cifLinea,
                            impLinea:     acc.impLinea     + c.impLinea,
                            agenteLinea:  acc.agenteLinea  + c.agenteLinea,
                            fleteCrLinea: acc.fleteCrLinea + c.fleteCrLinea,
                            bodegaLinea:  acc.bodegaLinea  + c.bodegaLinea,
                            otrosLinea:   acc.otrosLinea   + c.otrosLinea,
                            costoTotal:   acc.costoTotal   + c.costoTotal,
                            pVentaTotal:  acc.pVentaTotal  + c.pVentaTotal,
                          }
                        }, { fobLinea:0,fleteSeguro:0,cifLinea:0,impLinea:0,agenteLinea:0,fleteCrLinea:0,bodegaLinea:0,otrosLinea:0,costoTotal:0,pVentaTotal:0 })
                        const moneda = monedaCosteo === 'CRC' ? 'CRC' : 'USD'
                        const fmt = (v) => fmtCurrency(v, moneda)
                        // Validación: verificar que sumas coincidan con valores ingresados
                        const diffFlete  = Math.abs(tots.fleteSeguro - cif) > 0.01
                        const diffImp    = Math.abs(tots.impLinea    - arancel) > 0.01
                        const diffOtros  = Math.abs(tots.otrosLinea  - otrosMonto) > 0.01
                        return (
                          <>
                            <tr className="bg-sur2 font-bold border-t-2 border-border">
                              <td className="px-2 py-2 text-xs text-mist font-semibold" colSpan={2}>TOTALES</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.fobLinea)}</td>
                              <td className={`px-2 py-2 text-xs text-right ${diffFlete?'text-rs':'text-ink'}`}>{fmt(tots.fleteSeguro)}</td>
                              <td className="px-2 py-2 text-xs text-right text-tl">{fmt(tots.cifLinea)}</td>
                              <td className={`px-2 py-2 text-xs text-right ${diffImp?'text-rs':'text-ink'}`}>{fmt(tots.impLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.agenteLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.fleteCrLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.bodegaLinea)}</td>
                              <td className={`px-2 py-2 text-xs text-right ${diffOtros?'text-rs':'text-ink'}`}>{fmt(tots.otrosLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right font-bold text-ink">{fmt(tots.costoTotal)}</td>
                              <td className="px-2 py-2 text-xs text-right" colSpan={2}></td>
                              <td className="px-2 py-2 text-xs text-right font-bold text-gd">{fmt(tots.pVentaTotal)}</td>
                            </tr>
                            {/* Fila de verificación */}
                            <tr className="bg-sur3 text-[9px] text-mist">
                              <td colSpan={2} className="px-2 py-1">✓ Verificación vs ingresado</td>
                              <td className="px-2 py-1 text-right">{fmt(fob_total)}</td>
                              <td className={`px-2 py-1 text-right ${diffFlete?'text-rs font-semibold':''}`}>{fmt(cif)} {diffFlete&&'⚠'}</td>
                              <td className="px-2 py-1 text-right">{fmt(val_cif)}</td>
                              <td className={`px-2 py-1 text-right ${diffImp?'text-rs font-semibold':''}`}>{fmt(arancel)} {diffImp&&'⚠'}</td>
                              <td className="px-2 py-1 text-right">{fmt(Number(w.agente_aduana)||0)}</td>
                              <td className="px-2 py-1 text-right">{fmt(Number(w.flete_cr)||0)}</td>
                              <td className="px-2 py-1 text-right">{fmt(Number(w.bodega)||0)}</td>
                              <td className={`px-2 py-1 text-right ${diffOtros?'text-rs font-semibold':''}`}>{fmt(otrosMonto)} {diffOtros&&'⚠'}</td>
                              <td className="px-2 py-1 text-right">{fmt(total_cr)}</td>
                              <td colSpan={3} className="px-2 py-1"></td>
                            </tr>
                          </>
                        )
                      })()}
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <button className="btn btn-outline text-xs" onClick={() => setPaso(2)}>← Atrás</button>
              <button className="btn btn-primary text-xs" onClick={() => setPaso(4)}>Siguiente →</button>
            </div>
          </div>
          <ResumenLateral fob={fob_total} cif={cif} val_cif={val_cif} arancel={arancel} isc={isc} otros={otros} total={total_cr} tc={w.tc_usd_crc} tcFecha={tcHoy?.fecha} margen={margen} pvTotal={pvTotal} utilidad={utilidad} />
        </div>
      )}

      {/* ── PASO 4: Confirmar */}
      {paso === 4 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="card">
              <div className="card-header"><div className="card-title">✅ Confirmación del costeo</div></div>
              <div className="p-4 space-y-3">
                {[
                  ['Importación',    impSel?.codigo||'—'],
                  ['TC USD/CRC',     `₡${Number(w.tc_usd_crc).toLocaleString('es-CR',{minimumFractionDigits:2})}`],
                  ['Flete',          fmtCurrency(Number(w.flete_maritimo),'USD')],
                  ['Seguro',         fmtCurrency(Number(w.seguro),'USD')],
                  ['Arancel (monto)', fmtCurrency(Number(w.imp_dif_iva||0),'USD')],
                  ['ISC',            `${w.isc_pct}%`],
                  ['Agente aduanero',fmtCurrency(Number(w.agente_aduana),'USD')],
                  ['Flete CR',       fmtCurrency(Number(w.flete_cr),'USD')],
                  ['Bodega',         fmtCurrency(Number(w.bodega),'USD')],
                  ['Margen',         `${w.margen_default}%`],
                ].map(([k,v],i) => (
                  <div key={k} className={`flex justify-between py-1.5 text-xs ${i<9?'border-b border-border-lt':''}`}>
                    <span className="text-mist">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-border">
                  <span className="font-semibold text-sm">Costo total CR</span>
                  <span className="font-bold text-base text-tl">{fmtCurrency(total_cr,'USD')}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button className="btn btn-outline text-xs" onClick={() => setPaso(3)}>← Atrás</button>
              <button className="btn btn-primary text-xs" onClick={handleSubmit(onSubmit)} disabled={creando||editando}>
                {creando||editando ? 'Guardando...' : costeoEdit ? '✓ Guardar cambios' : '✓ Crear costeo en borrador'}
              </button>
            </div>
          </div>
          <ResumenLateral fob={fob_total} cif={cif} val_cif={val_cif} arancel={arancel} isc={isc} otros={otros} total={total_cr} tc={w.tc_usd_crc} tcFecha={tcHoy?.fecha} margen={margen} pvTotal={pvTotal} utilidad={utilidad} />
        </div>
      )}
    </div>
  )

  // ── VISTA LISTA
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="kpi"><div className="text-2xl font-bold text-ink">{costeos.length}</div><div className="text-[11px] text-mist">Total costeos</div></div>
        <div className="kpi"><div className="text-2xl font-bold text-sg">{aprobados}</div><div className="text-[11px] text-mist">Aprobados</div></div>
        <div className="kpi"><div className="text-2xl font-bold text-mist">{borradores}</div><div className="text-[11px] text-mist">Borradores</div></div>
        <div className="kpi"><div className="text-sm font-bold text-tl">{fmtCurrency(totalAprobado,'USD')}</div><div className="text-[11px] text-mist">Costo total aprobado</div></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-mist">{costeos.length} costeos registrados</div>
        <button className="btn btn-primary text-xs" onClick={abrirCrear}>＋ Nuevo costeo</button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header"><div className="card-title">💰 Costeos de importación</div></div>
        {isLoading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : costeos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">💰</div>
            <div className="text-sm font-medium text-ink mb-1">Sin costeos</div>
            <div className="text-xs text-mist mb-4">Creá el primer costeo para una importación</div>
            <button className="btn btn-primary text-xs" onClick={abrirCrear}>＋ Nuevo costeo</button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Importación</th>
                <th>TC USD/CRC</th>
                <th>CIF</th>
                <th>Imp. dif. IVA</th>
                <th>Costo total CR</th>
                <th>Margen</th>
                <th>Estado</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {costeos.map(c => {
                const cifC = Number(c.flete_maritimo)+Number(c.seguro)
                return (
                  <tr key={c.costeo_id}>
                    <td>
                      <div className="font-medium text-xs">{c.importaciones_rel?.map(r=>r.importacion?.codigo).join(' + ') || c.importacion?.codigo || 'Sin importación'}</div>
                      <div className="text-[10px] text-mist">{fmtDate(c.creado_en||c.created_at)}</div>
                    </td>
                    <td className="text-xs font-medium">₡{Number(c.tc_usd_crc).toLocaleString('es-CR',{minimumFractionDigits:2})}</td>
                    <td className="text-xs">{fmtCurrency(cifC,'USD')}</td>
                    <td className="text-xs text-center">{fmtCurrency(Number(c.arancel_monto)||0,'USD')}</td>
                    <td className="font-semibold text-xs">{fmtCurrency(Number(c.costo_total_cr)||0,'USD')}</td>
                    <td className="text-xs text-center">{c.margen_global ?? '—'}%</td>
                    <td><span className={ESTADO_PILL[c.estado]||'pill pill-gray'}>{ESTADO_LABEL[c.estado]||c.estado}</span></td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        {/* Editar siempre disponible excepto aprobado */}
                        {c.estado !== 'aprobado' && (
                          <button
                            className="btn btn-outline text-[10px] px-2 py-1 hover:border-tl hover:text-tl"
                            onClick={() => abrirEditar(c)}
                          >
                            ✏️ Editar
                          </button>
                        )}
                        {c.estado === 'borrador' && (
                          <>
                            <button
                              className="btn btn-outline text-[10px] px-2 py-1 text-tl hover:bg-tl hover:text-white"
                              onClick={() => setConfirmApr(c)}
                            >
                              ✓ Aprobar
                            </button>
                            <button
                              className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs"
                              onClick={() => setConfirmDel(c)}
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm aprobar */}
      {confirmApr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <div className="font-semibold text-ink">Aprobar costeo</div>
            </div>
            <div className="text-xs text-mist leading-relaxed">
              Vas a aprobar el costeo de <strong className="text-ink">{confirmApr.importaciones_rel?.map(r=>r.importacion?.codigo).join(' + ') || confirmApr.importacion?.codigo}</strong>.
            </div>
            <div className="rounded-card border border-am/30 bg-yellow-50 px-3 py-2.5 space-y-1">
              <div className="text-[11px] font-semibold text-am">⚠️ Acción irreversible</div>
              <div className="text-[10px] text-am/80 leading-relaxed">
                Una vez aprobado, el costeo <strong>no podrá ser modificado ni eliminado</strong>. Verificá que todos los datos sean correctos antes de continuar.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline text-xs" onClick={() => setConfirmApr(null)}>Cancelar</button>
              <button className="btn btn-primary text-xs" onClick={() => { aprobarCosteo(confirmApr.costeo_id); setConfirmApr(null) }}>✓ Confirmar aprobación</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm eliminar */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
            <div className="font-semibold text-ink">Eliminar costeo</div>
            <div className="text-xs text-mist">¿Eliminás el costeo en borrador de <strong className="text-ink">{confirmDel.importaciones_rel?.map(r=>r.importacion?.codigo).join(' + ') || confirmDel.importacion?.codigo}</strong>?</div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline text-xs" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger text-xs" onClick={() => { eliminarCosteo(confirmDel.costeo_id); setConfirmDel(null) }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
