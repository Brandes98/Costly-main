import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Spinner from '../../components/ui/Spinner'
import { useImportaciones, usePedidos, useHitos } from '../../hooks/useApi'
import {
  fmtDate, estadoLabel, estadoPillClass,
  importacionEstadoLabel, importacionEstadoPillClass
} from '../../lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import api from '../../lib/api'

// ── Hitos ordenados
const HITOS_ORDEN = [
  { key: 'confirmado',    label: 'Confirmado',    icon: '📋' },
  { key: 'en_produccion', label: 'En producción', icon: '🏭' },
  { key: 'listo_fabrica', label: 'Listo fábrica', icon: '📦' },
  { key: 'embarcado',     label: 'Embarcado',     icon: '🚢' },
  { key: 'en_transito',   label: 'En tránsito',   icon: '🌊' },
  { key: 'en_puerto_cr',  label: 'Puerto CR',     icon: '⚓' },
  { key: 'en_aduana',     label: 'En aduana',     icon: '🏛' },
  { key: 'en_bodega',     label: 'En bodega',     icon: '🏪' },
  { key: 'entregado',     label: 'Entregado',     icon: '✅' },
]
const ESTADOS_ORDEN = HITOS_ORDEN.map(h => h.key)

const TRANSICIONES = {
  borrador:      ['confirmado','cancelado'],
  confirmado:    ['en_produccion','cancelado'],
  en_produccion: ['listo_fabrica','cancelado'],
  listo_fabrica: ['embarcado'],
  embarcado:     ['en_transito'],
  en_transito:   ['en_puerto_cr'],
  en_puerto_cr:  ['en_aduana'],
  en_aduana:     ['en_bodega'],
  en_bodega:     ['entregado'],
  entregado:     ['cerrado'],
}

const getSemaforo = (fechaPlan) => {
  if (!fechaPlan) return null
  const dias = differenceInDays(parseISO(fechaPlan), new Date())
  if (dias < 0)  return 'red'
  if (dias <= 3) return 'yellow'
  return 'green'
}
const semClass = (c) => ({ red: 's3r', yellow: 's3y', green: 's3g' }[c] || 's3g')
const getProgreso = (estado) => { const i = ESTADOS_ORDEN.indexOf(estado); return i === -1 ? 0 : i }

// ── Mini formulario de hito (popover)
function HitoPopover({ hito, onClose, onSave, saving }) {
  const [fechaReal, setFechaReal] = useState(hito.fecha_real ? hito.fecha_real.slice(0,10) : new Date().toISOString().slice(0,10))
  const [nota,      setNota]      = useState(hito.nota || '')
  const [estado,    setEstado]    = useState(hito.estado === 'completado' ? 'completado' : 'en_proceso')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-semibold text-xs text-ink">{hito.nombre}</div>
            <div className="text-[10px] text-mist">Actualizar hito</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-input" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha real</label>
            <input
              type="date"
              className="form-input"
              value={fechaReal}
              onChange={e => setFechaReal(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Observación del hito..."
              value={nota}
              onChange={e => setNota(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary text-xs"
            disabled={saving}
            onClick={() => onSave({ estado, fecha_real: fechaReal || undefined, nota: nota || undefined })}
          >
            {saving ? 'Guardando...' : '✓ Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Timeline de pedido
function TimelinePedido({ pedido, expanded, onToggle }) {
  const qc              = useQueryClient()
  const [hitoEdit, setHitoEdit] = useState(null)

  const progreso = getProgreso(pedido.estado)
  const hitoNext = pedido.hitos?.find(h => h.estado !== 'completado')
  const sem      = hitoNext ? getSemaforo(hitoNext.fecha_plan) : null

  // Mutation: actualizar estado del pedido
  const { mutate: cambiarEstado, isPending: cambiando } = useMutation({
    mutationFn: ({ id, estado }) => api.patch(`/pedidos/${id}/estado`, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })

  // Mutation: actualizar hito
  const { mutate: actualizarHito, isPending: savingHito } = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/hitos/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); setHitoEdit(null) },
  })

  const siguientes = TRANSICIONES[pedido.estado] || []

  return (
    <>
      <div className="card overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={onToggle}
          >
            <span className={`s3 ${sem ? semClass(sem) : 's3g'}`} />
            <div>
              <div className="font-semibold text-xs text-ink">{pedido.codigo}</div>
              <div className="text-[10px] text-mist">
                {pedido.proveedor?.nombre || '—'} · {pedido._count?.lineas ?? 0} líneas
              </div>
            </div>
          </div>

          {/* Acciones: cambiar estado */}
          <div className="flex items-center gap-2">
            {hitoNext && (
              <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium hidden sm:block
                ${sem === 'red' ? 'bg-rs-l text-rs' : sem === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-sg-l text-sg'}`}>
                {hitoNext.nombre} — {fmtDate(hitoNext.fecha_plan)}
              </div>
            )}
            {/* Dropdown cambiar estado */}
            {siguientes.length > 0 && (
              <select
                className="h-7 border border-border rounded-lg px-2 text-xs text-ink bg-sur outline-none focus:border-tl cursor-pointer"
                value=""
                onChange={e => {
                  if (e.target.value) cambiarEstado({ id: pedido.pedido_id, estado: e.target.value })
                }}
                disabled={cambiando}
                onClick={e => e.stopPropagation()}
              >
                <option value="">
                  {cambiando ? 'Actualizando...' : '⚡ Avanzar estado'}
                </option>
                {siguientes.map(s => (
                  <option key={s} value={s}>{estadoLabel(s)}</option>
                ))}
              </select>
            )}
            <span className={`pill ${estadoPillClass(pedido.estado)}`}>
              {estadoLabel(pedido.estado)}
            </span>
            <span className="text-mist text-xs cursor-pointer" onClick={onToggle}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Timeline barra */}
        <div className="px-4 pb-3">
          <div className="relative">
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
            <div
              className="absolute top-3 left-0 h-0.5 bg-tl transition-all duration-500"
              style={{ width: `${(progreso / (HITOS_ORDEN.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {HITOS_ORDEN.map((hito, i) => {
                const done    = i <= progreso
                const current = i === progreso
                const hitoData = pedido.hitos?.find(h =>
                  h.nombre?.toLowerCase().includes(hito.label.toLowerCase().split(' ')[0])
                )
                return (
                  <div
                    key={hito.key}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                    style={{ width: `${100 / HITOS_ORDEN.length}%` }}
                    onClick={() => hitoData && setHitoEdit(hitoData)}
                    title={hitoData ? `Editar: ${hito.label}` : hito.label}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] z-10 transition-all
                      group-hover:scale-110 group-hover:shadow-md
                      ${done
                        ? current
                          ? 'border-tl bg-tl text-white shadow-[0_0_0_3px_rgba(31,122,122,0.2)]'
                          : 'border-tl bg-tl text-white'
                        : 'border-border bg-sur text-mist group-hover:border-tl/50'
                      } ${hitoData ? 'cursor-pointer' : 'cursor-default'}`}>
                      {done && !current ? '✓' : hito.icon}
                    </div>
                    <div className={`text-[8.5px] text-center leading-tight ${done ? 'text-tl font-medium' : 'text-mist'}`}>
                      {hito.label}
                    </div>
                    {hitoData?.fecha_real && (
                      <div className="text-[8px] text-sg">{fmtDate(hitoData.fecha_real)}</div>
                    )}
                    {hitoData?.fecha_plan && !hitoData?.fecha_real && (
                      <div className={`text-[8px] ${getSemaforo(hitoData.fecha_plan) === 'red' ? 'text-rs' : 'text-mist'}`}>
                        {fmtDate(hitoData.fecha_plan)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabla de hitos expandida */}
        {expanded && (
          <div className="border-t border-border-lt px-4 pb-4 pt-3 fade-up">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-mist mb-2">
              Hitos del pedido — click en un hito para editarlo
            </div>
            {!pedido.hitos?.length ? (
              <div className="text-xs text-mist py-2">Sin hitos registrados</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-sur2">
                    {['', 'Hito', 'Fecha plan', 'Fecha real', 'Estado', 'Nota', ''].map((h, i) => (
                      <th key={i} className="text-[10px] font-semibold text-mist uppercase tracking-wider px-3 py-1.5 text-left border-b border-border">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedido.hitos.map((hito, i) => {
                    const s = hito.fecha_plan ? getSemaforo(hito.fecha_plan) : null
                    const vencido = s === 'red' && hito.estado !== 'completado'
                    return (
                      <tr key={hito.hito_id || i} className="border-b border-border-lt hover:bg-sur2/50">
                        <td className="px-3 py-2">
                          <span className={`s3 ${hito.estado === 'completado' ? 's3g' : s ? semClass(s) : 's3y'}`} />
                        </td>
                        <td className="px-3 py-2 text-xs font-medium">{hito.nombre}</td>
                        <td className={`px-3 py-2 text-xs ${vencido ? 'text-rs font-medium' : 'text-mist'}`}>
                          {fmtDate(hito.fecha_plan) || '—'}
                          {vencido && <span className="ml-1 text-[9px] bg-rs-l text-rs px-1 rounded">Vencido</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-sg">{fmtDate(hito.fecha_real) || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`pill ${
                            hito.estado === 'completado' ? 'pill-green'
                            : hito.estado === 'en_proceso' ? 'pill-blue'
                            : 'pill-gray'
                          }`}>
                            {hito.estado === 'completado' ? 'Completado'
                            : hito.estado === 'en_proceso' ? 'En proceso'
                            : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-mist">{hito.nota || '—'}</td>
                        <td className="px-3 py-2">
                          <button
                            className="btn btn-outline text-[10px] px-2 py-0.5 hover:border-tl hover:text-tl"
                            onClick={() => setHitoEdit(hito)}
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Popover de edición de hito */}
      {hitoEdit && (
        <HitoPopover
          hito={hitoEdit}
          onClose={() => setHitoEdit(null)}
          saving={savingHito}
          onSave={(data) => actualizarHito({ id: hitoEdit.hito_id, data })}
        />
      )}
    </>
  )
}

// ── Página principal
export default function SeguimientoPage() {
  const navigate             = useNavigate()
  const [tab,      setTab]   = useState('pedidos')
  const [search,   setSrch]  = useState('')
  const [expandidos, setExp] = useState({})

  const { data: pedidos = [],       isLoading: loadP } = usePedidos()
  const { data: importaciones = [], isLoading: loadI } = useImportaciones()

  const toggle = (id) => setExp(prev => ({ ...prev, [id]: !prev[id] }))

  const pedidosActivos = useMemo(() =>
    pedidos
      .filter(p => !['cerrado','cancelado'].includes(p.estado))
      .filter(p => !search ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        p.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase())
      )
  , [pedidos, search])

  const impsActivas = useMemo(() =>
    importaciones
      .filter(i => i.estado !== 'cerrada')
      .filter(i => !search || i.codigo.toLowerCase().includes(search.toLowerCase()))
  , [importaciones, search])

  const vencidos   = pedidos.flatMap(p => p.hitos || []).filter(h => h.estado !== 'completado' && h.fecha_plan && getSemaforo(h.fecha_plan) === 'red').length
  const proximos   = pedidos.flatMap(p => p.hitos || []).filter(h => h.estado !== 'completado' && h.fecha_plan && getSemaforo(h.fecha_plan) === 'yellow').length
  const enTransito = importaciones.filter(i => i.estado === 'en_transito').length

  return (
    <div className="space-y-4 w-full min-w-0">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="kpi">
          <div className="text-2xl font-bold text-ink">{pedidosActivos.length}</div>
          <div className="text-[11px] text-mist">Pedidos activos</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-rs">{vencidos}</div>
          <div className="text-[11px] text-mist">Hitos vencidos</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold" style={{color:'#D97706'}}>{proximos}</div>
          <div className="text-[11px] text-mist">Próximos a vencer</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-tl">{enTransito}</div>
          <div className="text-[11px] text-mist">En tránsito</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-border bg-sur2 p-0.5">
          {[
            { key: 'pedidos',       label: `🚚 Pedidos (${pedidosActivos.length})` },
            { key: 'importaciones', label: `🚢 Importaciones (${impsActivas.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${tab === t.key ? 'bg-sur shadow-sm text-ink' : 'text-mist hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 h-8 px-3 border border-border rounded-lg bg-sur2 flex-1 max-w-xs">
          <span className="text-mist text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSrch(e.target.value)}
            className="bg-transparent outline-none text-xs text-ink placeholder:text-mist w-full"
          />
        </div>

        {tab === 'pedidos' && (
          <button className="btn btn-outline text-xs" onClick={() => {
            const todosExp = pedidosActivos.every(p => expandidos[p.pedido_id])
            const nuevo = {}
            if (!todosExp) pedidosActivos.forEach(p => { nuevo[p.pedido_id] = true })
            setExp(nuevo)
          }}>
            {pedidosActivos.every(p => expandidos[p.pedido_id]) ? '▲ Colapsar todo' : '▼ Expandir todo'}
          </button>
        )}
      </div>

      {/* Tab Pedidos */}
      {tab === 'pedidos' && (
        <div className="space-y-3">
          {loadP ? (
            <div className="flex justify-center p-12"><Spinner /></div>
          ) : pedidosActivos.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🚚</div>
              <div className="text-sm font-medium text-ink mb-1">Sin pedidos activos</div>
              <div className="text-xs text-mist">Todos los pedidos están cerrados o cancelados</div>
            </div>
          ) : (
            pedidosActivos.map(p => (
              <TimelinePedido
                key={p.pedido_id}
                pedido={p}
                expanded={!!expandidos[p.pedido_id]}
                onToggle={() => toggle(p.pedido_id)}
              />
            ))
          )}
        </div>
      )}

      {/* Tab Importaciones */}
      {tab === 'importaciones' && (
        <div className="space-y-3">
          {loadI ? (
            <div className="flex justify-center p-12"><Spinner /></div>
          ) : impsActivas.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🚢</div>
              <div className="text-sm font-medium text-ink mb-1">Sin importaciones activas</div>
            </div>
          ) : (
            impsActivas.map(imp => {
              const pedidosImp = imp.pedidos || []
              const IMP_HITOS  = [
                { label: 'Creada',      icon: '📋' },
                { label: 'En tránsito', icon: '🌊' },
                { label: 'Puerto CR',   icon: '⚓' },
                { label: 'Aduana',      icon: '🏛' },
                { label: 'En bodega',   icon: '🏪' },
              ]
              const progIdx   = ['en_proceso','en_transito','en_puerto_cr','en_aduana','en_bodega'].indexOf(imp.estado)
              const impProg   = Math.max(0, progIdx)

              return (
                <div key={imp.importacion_id} className="card">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-sur2"
                    onClick={() => navigate(`/importaciones/${imp.importacion_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`s3 ${imp.estado === 'en_transito' ? 's3r' : imp.estado === 'en_aduana' ? 's3y' : 's3g'}`} />
                      <div>
                        <div className="font-semibold text-xs text-ink">{imp.codigo}</div>
                        <div className="text-[10px] text-mist">
                          {pedidosImp.length} pedido{pedidosImp.length !== 1 ? 's' : ''} · {pedidosImp.map(p => p.codigo).join(' + ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-mist">{fmtDate(imp.fecha_union || imp.creado_en)}</span>
                      <span className={`pill ${importacionEstadoPillClass(imp.estado)}`}>
                        {importacionEstadoLabel(imp.estado)}
                      </span>
                      <span className="text-xs text-mist">→</span>
                    </div>
                  </div>

                  {/* Timeline importación */}
                  <div className="px-4 pb-4">
                    <div className="relative">
                      <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
                      <div
                        className="absolute top-3 left-0 h-0.5 bg-tl transition-all duration-500"
                        style={{ width: `${(impProg / (IMP_HITOS.length - 1)) * 100}%` }}
                      />
                      <div className="relative flex justify-between">
                        {IMP_HITOS.map((h, i) => {
                          const done    = i <= impProg
                          const current = i === impProg
                          return (
                            <div key={h.label} className="flex flex-col items-center gap-1" style={{ width: '20%' }}>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] z-10
                                ${done ? current
                                  ? 'border-tl bg-tl text-white shadow-[0_0_0_3px_rgba(31,122,122,0.2)]'
                                  : 'border-tl bg-tl text-white'
                                : 'border-border bg-sur text-mist'}`}>
                                {done && !current ? '✓' : h.icon}
                              </div>
                              <div className={`text-[8.5px] text-center ${done ? 'text-tl font-medium' : 'text-mist'}`}>
                                {h.label}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Pedidos chips */}
                  <div className="border-t border-border-lt px-4 py-3 flex flex-wrap gap-2">
                    {pedidosImp.map(p => (
                      <div
                        key={p.pedido_id}
                        onClick={e => { e.stopPropagation(); navigate(`/pedidos/${p.pedido_id}`) }}
                        className="flex items-center gap-1.5 bg-sur2 border border-border rounded-lg px-2 py-1 cursor-pointer hover:border-tl transition-colors"
                      >
                        <span className="text-[10px] font-medium">{p.codigo}</span>
                        <span className={`pill ${estadoPillClass(p.estado)}`} style={{fontSize:'9px',padding:'1px 6px'}}>
                          {estadoLabel(p.estado)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
