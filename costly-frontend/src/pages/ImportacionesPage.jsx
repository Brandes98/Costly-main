import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useImportaciones, usePedidos } from '../hooks/useApi'
import { fmtDate } from '../lib/utils'
import Spinner from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import api from '../lib/api'

const ESTADOS = [
  { value: '',             label: 'Todos los estados' },
  { value: 'en_proceso',   label: 'En proceso' },
  { value: 'en_transito',  label: 'En tránsito' },
  { value: 'en_aduana',    label: 'En aduana' },
  { value: 'en_bodega',    label: 'En bodega' },
  { value: 'cerrada',      label: 'Cerrada' },
]

const ESTADO_PILL = {
  borrador:    'pill pill-gray',
  en_proceso:  'pill pill-yellow',
  en_transito: 'pill pill-blue',
  en_aduana:   'pill pill-yellow',
  en_bodega:   'pill pill-violet',
  cerrada:     'pill pill-green',
}

const ESTADO_LABEL = {
  borrador:    'Borrador',
  en_proceso:  'En proceso',
  en_transito: 'En tránsito',
  en_aduana:   'En aduana',
  en_bodega:   'En bodega',
  cerrada:     'Cerrada',
}

const COSTEO_PILL = {
  borrador:   'pill pill-gray',
  confirmado: 'pill pill-yellow',
  aprobado:   'pill pill-green',
}

export default function ImportacionesPage() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [search,    setSearch]    = useState('')
  const [filtroEst, setFiltroEst] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selIds,    setSelIds]    = useState([])  // pedidos seleccionados para nueva importación
  const [nota,      setNota]      = useState('')

  const { data: importaciones = [], isLoading } = useImportaciones(
    filtroEst ? { estado: filtroEst } : {}
  )
  // Solo pedidos sin importación asignada y en estado válido
  const { data: pedidosSinImp = [] } = usePedidos({ sin_importacion: true })

  const { mutate: crearImportacion, isPending: creando } = useMutation({
    mutationFn: (data) => api.post('/pedidos/unir', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      setModalOpen(false)
      setSelIds([])
      setNota('')
    },
  })

  const filtered = importaciones.filter(imp =>
    !search ||
    imp.codigo.toLowerCase().includes(search.toLowerCase()) ||
    imp.pedidos?.some(p => p.codigo.toLowerCase().includes(search.toLowerCase()))
  )

  const togglePedido = (id) =>
    setSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleCrear = () => {
    if (selIds.length === 0) return
    crearImportacion({ pedido_ids: selIds, nota: nota || undefined })
  }

  // KPIs
  const activas  = importaciones.filter(i => i.estado !== 'cerrada').length
  const transito = importaciones.filter(i => i.estado === 'en_transito').length
  const aduana   = importaciones.filter(i => i.estado === 'en_aduana').length
  const sinCosteo= importaciones.filter(i => !i.costeos?.some(c => c.estado === 'aprobado')).length

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="kpi kt"><div className="k-ic">🚢</div><div className="k-v">{activas}</div><div className="k-l">Importaciones activas</div></div>
        <div className="kpi kg"><div className="k-ic">🌊</div><div className="k-v">{transito}</div><div className="k-l">En tránsito</div></div>
        <div className="kpi kr"><div className="k-ic">🏛</div><div className="k-v">{aduana}</div><div className="k-l">En aduana / fiscal</div></div>
        <div className="kpi ks"><div className="k-ic">💰</div><div className="k-v">{sinCosteo}</div><div className="k-l">Sin costeo aprobado</div></div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 h-8 px-3 text-xs text-mist border border-border rounded-lg bg-sur2 w-52">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar importación o pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-mist"
            />
          </div>
          <select
            className="form-input h-8 text-xs w-40"
            onChange={e => setFiltroEst(e.target.value)}
          >
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary text-xs" onClick={() => setModalOpen(true)}>
          ＋ Nueva importación
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🚢 Importaciones</div>
          <span className="text-[11.5px] text-mist">{filtered.length} registros</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🚢</div>
            <div className="text-sm font-medium text-ink mb-1">Sin importaciones</div>
            <div className="text-xs text-mist mb-4">Creá una importación seleccionando uno o más pedidos</div>
            <button className="btn btn-primary text-xs" onClick={() => setModalOpen(true)}>
              ＋ Nueva importación
            </button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Pedidos</th>
                <th>#</th>
                <th>Contenedor</th>
                <th>Estado</th>
                <th>Fecha unión</th>
                <th>Costeo</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(imp => {
                const costeoEstado = imp.costeos?.[0]?.estado
                return (
                  <tr key={imp.importacion_id} className="cursor-pointer" onClick={() => navigate(`/importaciones/${imp.importacion_id}`)}>
                    <td>
                      <strong className="text-xs">{imp.codigo}</strong>
                      {imp.consolidado && (
                        <div className="text-[10px] text-tl mt-0.5">
                          {imp.pedidos?.map(p => p.codigo).join(' + ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {imp.pedidos?.slice(0, 3).map(p => (
                          <span key={p.pedido_id} className="ic">
                            {p.proveedor?.nombre?.split(' ')[0]}
                          </span>
                        ))}
                        {imp.pedidos?.length > 3 && <span className="ic">+{imp.pedidos.length - 3}</span>}
                      </div>
                    </td>
                    <td className="text-center font-semibold text-xs">{imp._count?.pedidos || imp.pedidos?.length || 0}</td>
                    <td className="text-xs text-mist">{imp.contenedores?.map(c => c.codigo).join(', ') || '—'}</td>
                    <td><span className={ESTADO_PILL[imp.estado] || 'pill pill-gray'}>{ESTADO_LABEL[imp.estado] || imp.estado}</span></td>
                    <td className="text-xs text-mist">{fmtDate(imp.fecha_union) || '—'}</td>
                    <td>
                      {costeoEstado
                        ? <span className={COSTEO_PILL[costeoEstado] || 'pill pill-gray'}>{costeoEstado.charAt(0).toUpperCase() + costeoEstado.slice(1)}</span>
                        : <span className="text-xs text-mist">Sin costeo</span>
                      }
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-outline text-xs px-2 py-1" onClick={() => navigate(`/importaciones/${imp.importacion_id}`)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal nueva importación */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelIds([]); setNota('') }}
        title="Nueva importación"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModalOpen(false); setSelIds([]); setNota('') }}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCrear}
              disabled={selIds.length === 0 || creando}
            >
              {creando ? 'Creando...' : `Crear importación${selIds.length > 0 ? ` (${selIds.length} pedido${selIds.length > 1 ? 's' : ''})` : ''}`}
            </button>
          </>
        }
      >
        <div className="space-y-4">

          {/* Info */}
          <div className="bg-tl-xl border border-tl/20 rounded-card px-3 py-2 text-xs text-slate">
            Seleccioná <strong className="text-tl">uno o más pedidos</strong> para crear la importación.
            Un solo pedido crea una importación individual; dos o más las consolida.
          </div>

          {/* Lista de pedidos disponibles */}
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">
              Pedidos disponibles ({pedidosSinImp.length})
            </div>
            {pedidosSinImp.length === 0 ? (
              <div className="p-6 text-center text-xs text-mist border border-border rounded-card">
                No hay pedidos sin importación asignada
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {pedidosSinImp.map(p => {
                  const sel = selIds.includes(p.pedido_id)
                  return (
                    <div
                      key={p.pedido_id}
                      onClick={() => togglePedido(p.pedido_id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-card border cursor-pointer transition-all
                        ${sel
                          ? 'border-tl bg-tl-xl'
                          : 'border-border hover:border-tl/40 bg-sur'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                          ${sel ? 'border-tl bg-tl' : 'border-border'}`}>
                          {sel && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                        <div>
                          <div className="font-medium text-xs">{p.codigo}</div>
                          <div className="text-[10px] text-mist">{p.proveedor?.nombre} · {p.lineas?.length || 0} líneas</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`pill ${p.estado === 'confirmado' ? 'pill-green' : 'pill-yellow'}`}>
                          {p.estado}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nota */}
          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Consolidado por espacio en contenedor"
              value={nota}
              onChange={e => setNota(e.target.value)}
            />
          </div>

          {/* Resumen selección */}
          {selIds.length > 0 && (
            <div className="bg-sur2 border border-border rounded-card px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-mist">Pedidos seleccionados</span>
                <span className="font-semibold">{selIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mist">Tipo</span>
                <span className="font-semibold text-tl">
                  {selIds.length === 1 ? 'Importación individual' : 'Importación consolidada'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
