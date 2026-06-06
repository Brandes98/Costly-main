import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Spinner from '../../components/ui/Spinner'
import { useImportaciones, usePedidos } from '../../hooks/useApi'
import {
  fmtDate, estadoLabel, estadoPillClass,
  importacionEstadoLabel, importacionEstadoPillClass
} from '../../lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import api from '../../lib/api'

// ── Los 3 hitos automáticos del sistema
const HITOS_AUTO = [
  {
    key:         'listo_fabrica',
    label:       'Listo en fábrica',
    icon:        '📦',
    descripcion: 'Se marca automáticamente al confirmar el pedido',
    siguiente:   'Esperando cierre de importación',
  },
  {
    key:         'en_aduana',
    label:       'En aduana',
    icon:        '🏛',
    descripcion: 'Se marca automáticamente al cerrar la importación',
    siguiente:   'Esperando aprobación de costeo',
  },
  {
    key:         'en_bodega',
    label:       'En bodega',
    icon:        '🏪',
    descripcion: 'Se marca automáticamente al aprobar el costeo',
    siguiente:   'Proceso finalizado',
  },
]

const ESTADOS_ORDEN = HITOS_AUTO.map(h => h.key)

const getSemaforo = (fechaPlan) => {
  if (!fechaPlan) return null
  const dias = differenceInDays(parseISO(fechaPlan), new Date())
  if (dias < 0)  return 'red'
  if (dias <= 3) return 'yellow'
  return 'green'
}
const semClass = (c) => ({ red: 's3r', yellow: 's3y', green: 's3g' }[c] || 's3g')

const HITO_TIPO_LABEL = {
  confirmacion:    'Confirmación',
  pago_senal:      'Pago señal',
  produccion:      'Producción',
  embarque:        'Embarque',
  llegada_cr:      'Llegada CR',
  retiro_aduana:   'Retiro aduana',
  entrega_bodega:  'Entrega bodega',
  entrega_cliente: 'Entrega cliente',
  personalizado:   'Personalizado',
}

// Mapeo hito tipo → estado del pedido
const HITO_TIPO_MAP = {
  listo_fabrica: 'listo_fabrica',
  en_aduana:     'retiro_aduana',
  en_bodega:     'entrega_bodega',
}

const getProgreso = (etapa) => {
  if (etapa === 'en_bodega')     return 2
  if (etapa === 'en_aduana')     return 1
  if (etapa === 'listo_fabrica') return 0
  return -1
}

// ── Modal de edición de hito (solo lectura informativa para hitos auto)
function HitoPopover({ hito, onClose, onSave, saving }) {
  const [fechaPlan, setFechaPlan] = useState(hito.fecha_plan ? hito.fecha_plan.slice(0,10) : '')
  const [fechaReal, setFechaReal] = useState(hito.fecha_real ? hito.fecha_real.slice(0,10) : '')
  const [nota,      setNota]      = useState(hito.nota || '')
  const [estado,    setEstado]    = useState(hito.estado || 'pendiente')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-semibold text-xs text-ink">{hito.nombre || HITO_TIPO_LABEL[hito.tipo] || hito.tipo}</div>
            <div className="text-[10px] text-mist">Editar hito</div>
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
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha planificada</label>
            <input type="date" className="form-input" value={fechaPlan}
              onChange={e => setFechaPlan(e.target.value)} />
            <div className="text-[10px] text-mist mt-0.5">Fecha estimada en que debería ocurrir</div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha real</label>
            <input type="date" className="form-input" value={fechaReal}
              onChange={e => setFechaReal(e.target.value)} />
            <div className="text-[10px] text-mist mt-0.5">Fecha en que efectivamente ocurrió</div>
          </div>
          <div className="form-group">
            <label className="form-label">Nota</label>
            <textarea className="form-input min-h-[60px] resize-none text-xs"
              placeholder="Observación del hito..."
              value={nota} onChange={e => setNota(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary text-xs" disabled={saving}
            onClick={() => onSave({
              estado,
              fecha_plan: fechaPlan || undefined,
              fecha_real: fechaReal || undefined,
              nota:       nota      || undefined,
            })}>
            {saving ? 'Guardando...' : '✓ Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Timeline de pedido con 3 hitos automáticos
function TimelinePedido({ pedido, expanded, onToggle }) {
  const qc = useQueryClient()
  const [hitoEdit, setHitoEdit] = useState(null)

 const progreso = getProgreso(pedido.etapa_seguimiento)
console.log(pedido.codigo, pedido.etapa_seguimiento, progreso)
  // Próximo hito pendiente para semáforo
  const hitoNext = pedido.hitos?.find(h => h.estado !== 'completado' && h.fecha_plan)
  const sem      = hitoNext ? getSemaforo(hitoNext.fecha_plan) : null

  // Mutation: actualizar hito (edición manual de fechas/notas)
  const { mutate: actualizarHito, isPending: savingHito } = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/hitos/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); setHitoEdit(null) },
    
  })
console.log(pedido.codigo, pedido.etapa_seguimiento, progreso)
  // Estado descriptivo del pedido en el flujo automático
  const descripcionEstado = () => {
    const e = pedido.estado
    if (['borrador'].includes(e)) return { texto: 'Pendiente de confirmación', color: 'text-mist' }
    if (['confirmado', 'en_produccion', 'listo_fabrica'].includes(e)) return { texto: 'Listo en fábrica — esperando importación', color: 'text-tl' }
    if (['embarcado', 'en_transito', 'en_puerto_cr', 'en_aduana'].includes(e)) return { texto: 'En aduana — esperando costeo aprobado', color: 'text-am' }
    if (['en_bodega', 'entregado'].includes(e)) return { texto: 'En bodega — proceso finalizado', color: 'text-sg' }
    if (e === 'cerrado') return { texto: 'Pedido cerrado', color: 'text-mist' }
    if (e === 'cancelado') return { texto: 'Pedido cancelado', color: 'text-rs' }
    return { texto: estadoLabel(e), color: 'text-mist' }
  }
  const desc = descripcionEstado()

  return (
    <>
      <div className="card overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-3 flex-1">
            <span className={`s3 ${sem ? semClass(sem) : progreso >= 0 ? 's3g' : 's3y'}`} />
            <div>
              <div className="font-semibold text-xs text-ink">{pedido.codigo}</div>
              <div className="text-[10px] text-mist">
                {pedido.proveedor?.nombre || '—'} · {pedido._count?.lineas ?? 0} líneas
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium ${desc.color}`}>{desc.texto}</span>
            <span className={`pill ${estadoPillClass(pedido.estado)}`}>
              {estadoLabel(pedido.estado)}
            </span>
            <span className="text-mist text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Timeline 3 hitos */}
        <div className="px-4 pb-4">
          <div className="relative">
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
            <div
              className="absolute top-3 left-0 h-0.5 bg-tl transition-all duration-500"
style={{ width: progreso < 0 ? '0%' : progreso === 0 ? '0%' : `${(progreso / (HITOS_AUTO.length - 1)) * 100}%` }}            />
            <div className="relative flex justify-between">
              {HITOS_AUTO.map((hito, i) => {
                const done    = i <= progreso
                const current = i === progreso
                // Buscar hito real del pedido
                const tipoHito = HITO_TIPO_MAP[hito.key]
                const hitoData = pedido.hitos?.find(h => h.tipo === tipoHito)
                return (
                  <div
                    key={hito.key}
                    className="flex flex-col items-center gap-1 group"
                    style={{ width: `${100 / HITOS_AUTO.length}%` }}
                    title={hito.descripcion}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] z-10 transition-all
                      ${done
                        ? current
                          ? 'border-tl bg-tl text-white shadow-[0_0_0_3px_rgba(31,122,122,0.2)]'
                          : 'border-tl bg-tl text-white'
                        : 'border-border bg-sur text-mist'
                      }`}>
                      {done && !current ? '✓' : hito.icon}
                    </div>
                    <div className={`text-[9px] text-center leading-tight font-medium ${done ? 'text-tl' : 'text-mist'}`}>
                      {hito.label}
                    </div>
                    {/* Fecha real si existe */}
                    {hitoData?.fecha_real && (
                      <div className="text-[8px] text-sg">{fmtDate(hitoData.fecha_real)}</div>
                    )}
                    {/* Badge automático */}
                    <div className="text-[7.5px] text-mist text-center leading-tight px-1">
                      {hito.descripcion.split('al ')[1] || ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Descripción del siguiente paso */}
          {progreso >= 0 && progreso < HITOS_AUTO.length - 1 && (
            <div className="mt-3 rounded-card border border-tl/20 bg-tl-xl px-3 py-2 text-[10px] text-tl flex items-center gap-2">
              <span>⏳</span>
              <span>Siguiente: {HITOS_AUTO[progreso]?.siguiente}</span>
            </div>
          )}
          {progreso >= HITOS_AUTO.length - 1 && (
            <div className="mt-3 rounded-card border border-sg/20 bg-sg-l px-3 py-2 text-[10px] text-sg flex items-center gap-2">
              <span>✅</span>
              <span>Proceso completado — pedido en bodega</span>
            </div>
          )}
        </div>

        {/* Tabla de todos los hitos expandida */}
        {expanded && (
          <div className="border-t border-border-lt px-4 pb-4 pt-3 fade-up">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-mist mb-2">
              Detalle de hitos — click en ✏️ para editar fechas o notas
            </div>
            <div className="rounded-card border border-am/20 bg-yellow-50 px-3 py-2 text-[10px] text-am mb-3 flex items-center gap-2">
              <span>ℹ️</span>
              <span>Los hitos principales se actualizan automáticamente. Solo podés editar fechas y notas.</span>
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
                  {[...(pedido.hitos||[])].sort((a,b) => {
                    const ORDEN = ['confirmacion','pago_senal','produccion','embarque','llegada_cr','retiro_aduana','entrega_bodega','entrega_cliente']
                    return ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo)
                  }).map((hito, i) => {
                    const s = hito.fecha_plan ? getSemaforo(hito.fecha_plan) : null
                    const vencido = s === 'red' && hito.estado !== 'completado' && !hito.fecha_real
                    // Marcar hitos automáticos
                    const esAuto = ['listo_fabrica','retiro_aduana','entrega_bodega'].includes(hito.tipo)
                    return (
                      <tr key={hito.hito_id || i} className="border-b border-border-lt hover:bg-sur2/50">
                        <td className="px-3 py-2">
                          <span className={`s3 ${(hito.estado === 'completado' || hito.fecha_real) ? 's3g' : s ? semClass(s) : 's3y'}`} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium">{hito.nombre || HITO_TIPO_LABEL[hito.tipo] || hito.tipo}</div>
                          {esAuto && <div className="text-[9px] text-tl">🤖 Automático</div>}
                        </td>
                        <td className={`px-3 py-2 text-xs ${vencido ? 'text-rs font-medium' : 'text-mist'}`}>
                          {fmtDate(hito.fecha_plan) || '—'}
                          {vencido && <span className="ml-1 text-[9px] bg-rs-l text-rs px-1 rounded">Vencido</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-sg">{fmtDate(hito.fecha_real) || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`pill ${
                            (hito.estado === 'completado' || hito.fecha_real) ? 'pill-green'
                            : hito.estado === 'en_proceso' ? 'pill-blue'
                            : 'pill-gray'
                          }`}>
                            {(hito.estado === 'completado' || hito.fecha_real) ? 'Completado'
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

      {/* Modal editar hito */}
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

      {/* Banner informativo del flujo automático */}
      <div className="rounded-card border border-tl/20 bg-tl-xl px-4 py-3 text-xs text-tl flex items-start gap-3">
        <span className="text-base mt-0.5">🤖</span>
        <div>
          <div className="font-semibold mb-1">Seguimiento automático</div>
          <div className="text-[10px] text-mist leading-relaxed">
            El sistema avanza los hitos automáticamente:
            <span className="mx-1 font-semibold text-tl">Confirmar pedido → Listo en fábrica</span>·
            <span className="mx-1 font-semibold text-tl">Cerrar importación → En aduana</span>·
            <span className="mx-1 font-semibold text-tl">Aprobar costeo → En bodega</span>
          </div>
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
              const progIdx = ['en_proceso','en_transito','en_puerto_cr','en_aduana','en_bodega'].indexOf(imp.estado)
              const impProg = Math.max(0, progIdx)

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
