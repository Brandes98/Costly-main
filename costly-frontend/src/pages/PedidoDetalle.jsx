// ══════════════════════════════════════════════
// Páginas placeholder — completar pantalla por pantalla
// ══════════════════════════════════════════════

// src/pages/PedidoDetalle.jsx
import { useParams } from 'react-router-dom'
import { usePedido } from '../hooks/useApi'
import Spinner from '../components/ui/Spinner'
import { estadoPillClass, estadoLabel, fmtDate } from '../lib/utils'

export default function PedidoDetalle() {
  const { id } = useParams()
  const { data: pedido, isLoading } = usePedido(id)

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!pedido)   return <div className="text-center text-mist p-12">Pedido no encontrado</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-ink">{pedido.codigo}</h1>
          <div className="text-xs text-mist mt-0.5">
            {pedido.proveedor?.nombre} · {fmtDate(pedido.fecha_pedido)}
          </div>
        </div>
        <span className={`pill ${estadoPillClass(pedido.estado)}`}>
          {estadoLabel(pedido.estado)}
        </span>
      </div>

      {/* Líneas */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Líneas del pedido</div>
          <span className="text-xs text-mist">{pedido.lineas?.length} líneas</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas?.map(l => (
              <tr key={l.linea_id}>
                <td className="text-mist">{l.numero}</td>
                <td>
                  <div className="font-medium">{l.producto?.nombre}</div>
                  <div className="text-[10px] text-mist">{l.producto?.sku}</div>
                </td>
                <td>{Number(l.cantidad).toLocaleString()}</td>
                <td>${Number(l.precio_unit).toFixed(2)}</td>
                <td className="font-semibold">${Number(l.total_linea).toLocaleString('es-CR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hitos */}
      {pedido.hitos?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🎯 Hitos</div>
          </div>
          <div className="card-body flex flex-col gap-2">
            {pedido.hitos.map(h => (
              <div key={h.hito_id} className="flex items-center justify-between py-1.5 border-b border-border-lt last:border-b-0">
                <span className="text-xs">{h.tipo?.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mist">{fmtDate(h.fecha_plan)}</span>
                  <span className={`pill ${h.estado === 'completado' ? 'pill-green' : 'pill-gray'}`}>{h.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
