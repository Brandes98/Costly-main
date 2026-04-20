import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useCosteos, useCreateCosteo, useAprobarCosteo, useDeleteCosteo,
  useImportaciones, useTCHoy
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
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['arancel_pct','isc_pct','agente_aduana','otros_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega','otros_cr'] },
  ],
  aereo: [
    { key: 'flete',   label: '✈️ Flete aéreo',         campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['arancel_pct','isc_pct','agente_aduana','otros_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega','otros_cr'] },
  ],
  terrestre: [
    { key: 'flete',   label: '🚛 Flete terrestre',     campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['arancel_pct','isc_pct','agente_aduana','otros_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega','otros_cr'] },
  ],
  multimodal: [
    { key: 'flete',   label: '🔄 Flete principal',     campos: ['flete_maritimo','seguro'] },
    { key: 'aduana',  label: '🏛 Aduana y tributos',   campos: ['arancel_pct','isc_pct','agente_aduana','otros_aduana'] },
    { key: 'local',   label: '🏠 Costos locales CR',   campos: ['flete_cr','bodega','otros_cr'] },
  ],
}

const CAMPO_LABEL = {
  flete_maritimo: 'Flete',
  seguro:         'Seguro',
  arancel_pct:    'Arancel %',
  isc_pct:        'ISC %',
  agente_aduana:  'Agente aduanero',
  otros_aduana:   'Otros (aduana)',
  flete_cr:       'Flete CR',
  bodega:         'Bodega / almacenaje',
  otros_cr:       'Otros (CR)',
}

const ESTADO_PILL  = { borrador:'pill pill-gray', confirmado:'pill pill-yellow', aprobado:'pill pill-green' }
const ESTADO_LABEL = { borrador:'Borrador', confirmado:'Confirmado', aprobado:'Aprobado' }
const PASOS = ['Importación', 'Transporte', 'Margen', 'Confirmar']

const schema = z.object({
  importacion_id: z.coerce.number().positive('Seleccioná una importación'),
  tc_usd_crc:     z.coerce.number().positive('TC requerido'),
  flete_maritimo: z.coerce.number().min(0).default(0),
  seguro:         z.coerce.number().min(0).default(0),
  arancel_pct:    z.coerce.number().min(0).max(100).default(0),
  isc_pct:        z.coerce.number().min(0).max(100).default(0),
  agente_aduana:  z.coerce.number().min(0).default(0),
  flete_cr:       z.coerce.number().min(0).default(0),
  bodega:         z.coerce.number().min(0).default(0),
  otros_aduana:   z.coerce.number().min(0).default(0),
  otros_cr:       z.coerce.number().min(0).default(0),
  margen_default: z.coerce.number().min(0).max(100).default(35),
})

// ── Sección expandible del paso 2
function SeccionCostos({ seccion, register, watch, abierta, onToggle }) {
  const vals = watch()
  const tieneValor = seccion.campos.some(c => Number(vals[c]) > 0)

  return (
    <div className="border border-border rounded-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors
          ${abierta ? 'bg-tl-xl border-b border-tl/20' : 'bg-sur hover:bg-sur2'}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{seccion.label}</span>
          {tieneValor && !abierta && (
            <span className="pill pill-green text-[9px]">✓ Con datos</span>
          )}
        </div>
        <span className="text-mist text-xs">{abierta ? '▲' : '▼'}</span>
      </button>
      {abierta && (
        <div className="p-4 grid grid-cols-2 gap-3 bg-sur fade-up">
          {seccion.campos.map(campo => (
            <div key={campo} className="form-group">
              <label className="form-label">{CAMPO_LABEL[campo]}</label>
              <input
                {...register(campo)}
                type="number"
                step={campo.includes('pct') ? '0.01' : '0.01'}
                className="form-input"
                placeholder="0"
              />
            </div>
          ))}
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

// ── Componente principal
export default function CosteosPage() {
  const qc                          = useQueryClient()
  const [modoWizard, setModoWizard] = useState(false)
  const [costeoEdit, setCosteoEdit] = useState(null) // costeo en edición
  const [paso,       setPaso]       = useState(1)
  const [tipoTransp, setTipoTransp] = useState('maritimo')
  const [seccionAb,  setSeccionAb]  = useState('flete') // sección abierta
  const [conIVI,     setConIVI]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [confirmApr, setConfirmApr] = useState(null)

  const { data: costeos      = [], isLoading } = useCosteos()
  const { data: importaciones = [] }           = useImportaciones()
  const { data: tcHoy }                        = useTCHoy()

  const { mutate: crearCosteo,   isPending: creando   } = useCreateCosteo()
  const { mutate: aprobarCosteo                        } = useAprobarCosteo()
  const { mutate: eliminarCosteo                       } = useDeleteCosteo()

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
      otros_aduana:0, otros_cr:0, margen_default:35,
    }
  })

  useEffect(() => {
    if (tcHoy?.valor) setValue('tc_usd_crc', tcHoy.valor)
  }, [tcHoy])

  const w = watch()

  // ── Cálculos
  const impSel    = importaciones.find(i => i.importacion_id === Number(w.importacion_id))
  const lineas    = impSel?.pedidos?.flatMap(p => p.lineas || []) || []
  const fob_total = lineas.reduce((s,l) => s + Number(l.precio_unit_usd||l.precio_unit||0) * Number(l.cantidad), 0)
  const cif       = (Number(w.flete_maritimo)||0) + (Number(w.seguro)||0)
  const val_cif   = fob_total + cif
  const arancel   = val_cif * ((Number(w.arancel_pct)||0)/100)
  const isc       = val_cif * ((Number(w.isc_pct)||0)/100)
  const iva_ref   = (val_cif + arancel + isc) * 0.13
  const otros     = (Number(w.agente_aduana)||0)+(Number(w.flete_cr)||0)+(Number(w.bodega)||0)+(Number(w.otros_aduana)||0)+(Number(w.otros_cr)||0)
  const total_cr  = val_cif + arancel + isc + otros
  const margen    = Number(w.margen_default) || 35

  const calcLinea = (l) => {
    const costoOrig   = Number(l.precio_unit_usd||l.precio_unit||0) * Number(l.cantidad)
    const pct         = fob_total > 0 ? costoOrig / fob_total : 0
    const distLog     = total_cr * pct - costoOrig
    const costoUnitCR = fob_total > 0 ? (total_cr * pct) / Number(l.cantidad) : 0
    const pVentaUnit  = costoUnitCR * (1 + margen/100) * (conIVI ? 1.13 : 1)
    const pVentaTotal = pVentaUnit * Number(l.cantidad)
    const utilidad    = pVentaTotal - (costoUnitCR * Number(l.cantidad))
    return { costoOrig, distLog, costoUnitCR, pVentaUnit, pVentaTotal, utilidad }
  }

  const pvTotal  = lineas.reduce((s,l) => s + calcLinea(l).pVentaTotal, 0)
  const utilidad = lineas.reduce((s,l) => s + calcLinea(l).utilidad, 0)

  const abrirCrear = () => {
    setCosteoEdit(null)
    reset()
    if (tcHoy?.valor) setValue('tc_usd_crc', tcHoy.valor)
    setTipoTransp('maritimo')
    setSeccionAb('flete')
    setPaso(1)
    setModoWizard(true)
  }

  const abrirEditar = (c) => {
    setCosteoEdit(c)
    reset({
      importacion_id: c.importacion_id,
      tc_usd_crc:     Number(c.tc_usd_crc),
      flete_maritimo: Number(c.flete_maritimo)||0,
      seguro:         Number(c.seguro)||0,
      arancel_pct:    Number(c.arancel_pct)||0,
      isc_pct:        Number(c.isc_pct)||0,
      agente_aduana:  Number(c.agente_aduana)||0,
      flete_cr:       Number(c.flete_cr)||0,
      bodega:         Number(c.bodega)||0,
      otros_aduana:   Number(c.otros_aduana)||0,
      otros_cr:       Number(c.otros_cr)||0,
      margen_default: Number(c.margen_default)||35,
    })
    setTipoTransp('maritimo')
    setSeccionAb('flete')
    setPaso(1)
    setModoWizard(true)
  }

  const cerrarWizard = () => { setModoWizard(false); setCosteoEdit(null); setPaso(1); reset() }

  const onSubmit = (data) => {
    if (costeoEdit) {
      editarCosteo({ id: costeoEdit.costeo_id, data })
    } else {
      crearCosteo(data, { onSuccess: cerrarWizard })
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
        {PASOS.map((p,i) => (
          <div key={p} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold transition-all
                ${i+1 < paso ? 'bg-tl border-tl text-white' : i+1===paso ? 'bg-ink border-ink text-white' : 'bg-white border-border text-mist'}`}>
                {i+1 < paso ? '✓' : i+1}
              </div>
              <div className={`text-[9.5px] mt-1 ${i+1===paso?'text-ink font-semibold':i+1<paso?'text-tl':'text-mist'}`}>{p}</div>
            </div>
            {i < PASOS.length-1 && <div className={`flex-1 h-0.5 mx-1 mb-3.5 ${i+1<paso?'bg-tl':'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* ── PASO 1: Importación */}
      {paso === 1 && (
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
            <div className="flex justify-end">
              <button className="btn btn-primary text-xs" onClick={() => { if (w.importacion_id) setPaso(2) }}>Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 2: Transporte por secciones */}
      {paso === 2 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">

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

            {/* TC */}
            <div className="card">
              <div className="card-header"><div className="card-title">💱 Tipo de cambio</div></div>
              <div className="p-4">
                <div className="form-group">
                  <label className="form-label">TC USD/CRC ↻</label>
                  <input {...register('tc_usd_crc')} type="number" step="0.01" className="form-input" />
                </div>
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
                />
              ))}
            </div>

            {/* IVA D-150 */}
            <div className="bg-vi-l border border-vi/20 rounded-card px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-vi">💼 IVA D-150</span>
                <span className="text-xs text-mist ml-2">(referencia, no va al costo)</span>
                <span className="ml-2 bg-sur3 border border-border text-mist text-[9px] px-1.5 py-0.5 rounded font-semibold">NO VA AL COSTO</span>
              </div>
              <span className="font-bold text-gd">{fmtCurrency(iva_ref,'USD')}</span>
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
                {lineas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-mist">No hay líneas de producto en esta importación</div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr className="bg-sur2">
                        {['Producto','Costo orig.','Dist. log.','Costo unit CR','Margen %','P.Venta unit.','P.Venta total','Utilidad'].map(h => (
                          <th key={h} className="text-[10px] font-semibold text-mist uppercase tracking-wider px-3 py-2 text-left border-b border-border">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((l,i) => {
                        const c = calcLinea(l)
                        return (
                          <tr key={l.linea_id||i} className="border-b border-border-lt hover:bg-sur2/50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-xs">{l.producto?.nombre||l.producto_id}</div>
                              <div className="text-[10px] text-mist">×{l.cantidad} uds</div>
                            </td>
                            <td className="px-3 py-2 text-xs">{fmtCurrency(c.costoOrig,'USD')}</td>
                            <td className="px-3 py-2 text-xs text-mist">{fmtCurrency(c.distLog,'USD')}</td>
                            <td className="px-3 py-2 text-xs font-semibold">{fmtCurrency(c.costoUnitCR,'USD')}</td>
                            <td className="px-3 py-2 text-xs">{margen}%</td>
                            <td className="px-3 py-2 text-xs font-semibold text-gd">{fmtCurrency(c.pVentaUnit,'USD')}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-tl">{fmtCurrency(c.pVentaTotal,'USD')}</td>
                            <td className="px-3 py-2 text-xs text-sg">{fmtCurrency(c.utilidad,'USD')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-sur2 font-bold">
                        <td colSpan={6} className="px-3 py-2 text-xs text-mist">TOTALES</td>
                        <td className="px-3 py-2 text-sm text-tl">{fmtCurrency(pvTotal,'USD')}</td>
                        <td className="px-3 py-2 text-sm text-sg">{fmtCurrency(utilidad,'USD')}</td>
                      </tr>
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
                  ['Arancel',        `${w.arancel_pct}%`],
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
                <th>Arancel</th>
                <th>IVA D-150</th>
                <th>Costo total CR</th>
                <th>Margen</th>
                <th>Estado</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {costeos.map(c => {
                const cifC = Number(c.flete_maritimo)+Number(c.seguro)
                const iva  = cifC*(1+Number(c.arancel_pct)/100+Number(c.isc_pct)/100)*0.13
                return (
                  <tr key={c.costeo_id}>
                    <td>
                      <div className="font-medium text-xs">{c.importacion?.codigo||`IMP-${c.importacion_id}`}</div>
                      <div className="text-[10px] text-mist">{fmtDate(c.creado_en||c.created_at)}</div>
                    </td>
                    <td className="text-xs font-medium">₡{Number(c.tc_usd_crc).toLocaleString('es-CR',{minimumFractionDigits:2})}</td>
                    <td className="text-xs">{fmtCurrency(cifC,'USD')}</td>
                    <td className="text-xs text-center">{c.arancel_pct}%</td>
                    <td>
                      <span className="incb">D-150</span>
                      <span className="ml-1 text-xs text-vi">{fmtCurrency(iva,'USD')}</span>
                    </td>
                    <td className="font-semibold text-xs">{fmtCurrency(Number(c.costo_total_cr)||0,'USD')}</td>
                    <td className="text-xs text-center">{c.margen_default}%</td>
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
            <div className="font-semibold text-ink">Aprobar costeo</div>
            <div className="text-xs text-mist">¿Aprobás el costeo de <strong className="text-ink">{confirmApr.importacion?.codigo}</strong>? No se puede deshacer.</div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline text-xs" onClick={() => setConfirmApr(null)}>Cancelar</button>
              <button className="btn btn-primary text-xs" onClick={() => { aprobarCosteo(confirmApr.costeo_id); setConfirmApr(null) }}>✓ Aprobar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm eliminar */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
            <div className="font-semibold text-ink">Eliminar costeo</div>
            <div className="text-xs text-mist">¿Eliminás el costeo en borrador de <strong className="text-ink">{confirmDel.importacion?.codigo}</strong>?</div>
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
