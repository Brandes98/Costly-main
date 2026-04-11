import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { TableCard, TableContainer } from '../../components/ui/Table';
import { usePedido } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import { estadoPillClass, estadoLabel, fmtDate } from '../../lib/utils';

export default function PedidoDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: pedido, isLoading } = usePedido(id);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!pedido) {
    return <div className="p-12 text-center text-mist">Pedido no encontrado</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <button className="btn btn-outline px-2 text-xs" onClick={() => navigate(-1)}>
            <FaArrowLeft aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">{pedido.codigo}</h1>
            <div className="mt-0.5 text-xs text-mist">
              {pedido.proveedor?.nombre} · {fmtDate(pedido.fecha_pedido)}
            </div>
          </div>
        </div>
        <span className={`pill ${estadoPillClass(pedido.estado)}`}>
          {estadoLabel(pedido.estado)}
        </span>
      </div>

      <TableCard
        title="📋 Líneas del pedido"
        countLabel={`${pedido.lineas?.length || 0} líneas`}
        isEmpty={!pedido.lineas?.length}
        emptyMessage="No hay líneas para mostrar"
      >
        <TableContainer>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas?.map((linea) => (
              <tr key={linea.linea_id}>
                <td className="text-mist">{linea.numero}</td>
                <td>
                  <div className="font-medium">{linea.producto?.nombre}</div>
                  <div className="text-[10px] text-mist">{linea.producto?.sku}</div>
                </td>
                <td>{Number(linea.cantidad).toLocaleString()}</td>
                <td>${Number(linea.precio_unit).toFixed(2)}</td>
                <td className="font-semibold">
                  ${Number(linea.total_linea).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      {pedido.hitos?.length > 0 && (
        <TableCard title="🎯 Hitos">
          <div className="card-body flex flex-col gap-2">
            {pedido.hitos.map((hito) => (
              <div
                key={hito.hito_id}
                className="flex items-center justify-between border-b border-border-lt py-1.5 last:border-b-0"
              >
                <span className="text-xs">{hito.tipo?.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mist">{fmtDate(hito.fecha_plan)}</span>
                  <span
                    className={`pill ${hito.estado === 'completado' ? 'pill-green' : 'pill-gray'}`}
                  >
                    {hito.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TableCard>
      )}
    </div>
  );
}
