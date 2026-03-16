import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePedidos } from '../hooks/useApi'
import { fmtCurrency, fmtDate, estadoPillClass, estadoLabel, getSemaforo, semaforoClass } from '../lib/utils'
import Spinner from '../components/ui/Spinner'

const ESTADOS = ['borrador','confirmado','en_produccion','listo_fabrica','embarcado','en_transito','en_puerto_cr','en_aduana','en_bodega','entregado','cerrado','cancelado']

export default function PedidosPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({})
  const [search, setSearch]   = useState('')

  const { data: pedidos = [], isLoading } = usePedidos(filters)

  const filtered = pedidos.filter(p =>
    !search || p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    p.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 h-8 px-3 text-xs text-mist border border-border rounded-lg bg-sur2 w-52 cursor-text">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-mist"
            />
          </div>
          <select
            className="form-input h-8 text-xs w-40"
            onChange={e => setFilters(f => ({ ...f, estado: e.target.value || undefined }))}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => (
              <option key={e} value={e}>{estadoLabel(e)}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary text-xs"
          onClick={() => navigate('/pedidos/nuevo')}
        >
          ＋ Nuevo pedido
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Pedidos</div>
          <span className="text-[11.5px] text-mist">{filtered.length} pedidos</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-mist">
            📭 No hay pedidos que mostrar
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-6" />
                <th>Pedido</th>
                <th>Proveedor</th>
                <th>Incoterm</th>
                <th>Estado</th>
                <th>Próx. Hito</th>
                <th>Moneda</th>
                <th>Líneas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const hito = p.hitos?.[0]
                const sem  = hito ? getSemaforo(hito.fecha_plan) : 'green'
                return (
                  <tr
                    key={p.pedido_id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/pedidos/${p.pedido_id}`)}
                  >
                    <td className="pl-3">
                      <span className={`s3 ${semaforoClass(sem)}`} />
                    </td>
                    <td>
                      <strong className="text-xs">{p.codigo}</strong>
                      {p.codigo_padre && (
                        <div className="text-[10px] text-tl">{p.codigo_padre}</div>
                      )}
                    </td>
                    <td>
                      <span className="ic">
                        {p.proveedor?.pais?.bandera} {p.proveedor?.nombre}
                      </span>
                    </td>
                    <td>
                      <span className="incb">{p.incoterm}</span>
                    </td>
                    <td>
                      <span className={`pill ${estadoPillClass(p.estado)}`}>
                        {estadoLabel(p.estado)}
                      </span>
                    </td>
                    <td className="text-[11px]">
                      {hito
                        ? <span className={sem === 'red' ? 'text-rs font-medium' : sem === 'yellow' ? 'text-am font-medium' : 'text-mist'}>
                            {fmtDate(hito.fecha_plan)}
                          </span>
                        : <span className="text-mist">—</span>
                      }
                    </td>
                    <td className="font-medium text-xs">{p.moneda}</td>
                    <td className="text-mist text-xs">{p._count?.lineas}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
