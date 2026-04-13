import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { usePedidos } from '../../hooks/useApi';
import {
  estadoLabel,
  estadoPillClass,
  fmtDate,
  getSemaforo,
  pedidoEstadoOptions,
  semaforoClass,
} from '../../lib/utils';

export default function PedidosPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  const { data: pedidos = [], isLoading } = usePedidos(filters);

  const filtered = pedidos.filter(
    (pedido) =>
      !search ||
      pedido.codigo.toLowerCase().includes(search.toLowerCase()) ||
      pedido.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pedido..."
        filters={[
          {
            value: filters.estado ?? '',
            onChange: (value) => setFilters((current) => ({ ...current, estado: value || undefined })),
            options: pedidoEstadoOptions.map((estado) => ({ value: estado, label: estadoLabel(estado) })),
            placeholder: 'Todos los estados',
          },
        ]}
        createLabel="Nuevo pedido"
        onCreate={() => navigate('/pedidos/nuevo')}
      />

      <TableCard
        title="📋 Pedidos"
        countLabel={`${filtered.length} pedidos`}
        loading={isLoading}
        isEmpty={filtered.length === 0}
        emptyMessage="No hay pedidos que mostrar"
      >
        <TableContainer minWidth="min-w-[820px]">
          <thead>
            <tr>
              <th className="w-6" />
              <th>Pedido</th>
              <th>Proveedor</th>
              <th>Incoterm</th>
              <th>Estado</th>
              <th>Prox. hito</th>
              <th>Moneda</th>
              <th>Lineas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pedido) => {
              const hito = pedido.hitos?.[0];
              const semaforo = hito ? getSemaforo(hito.fecha_plan) : 'green';

              return (
                <tr
                  key={pedido.pedido_id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/pedidos/${pedido.pedido_id}`)}
                >
                  <td className="pl-3">
                    <span className={`s3 ${semaforoClass(semaforo)}`} />
                  </td>
                  <td>
                    <strong className="text-xs">{pedido.codigo}</strong>
                    {pedido.codigo_padre && (
                      <div className="text-[10px] text-tl">{pedido.codigo_padre}</div>
                    )}
                  </td>
                  <td>
                    <span className="ic">
                      {pedido.proveedor?.pais?.bandera} {pedido.proveedor?.nombre}
                    </span>
                  </td>
                  <td>
                    <span className="incb">{pedido.incoterm}</span>
                  </td>
                  <td>
                    <span className={`pill ${estadoPillClass(pedido.estado)}`}>
                      {estadoLabel(pedido.estado)}
                    </span>
                  </td>
                  <td className="text-[11px]">
                    {hito ? (
                      <span
                        className={
                          semaforo === 'red'
                            ? 'text-rs font-medium'
                            : semaforo === 'yellow'
                              ? 'text-am font-medium'
                              : 'text-mist'
                        }
                      >
                        {fmtDate(hito.fecha_plan)}
                      </span>
                    ) : (
                      <span className="text-mist">-</span>
                    )}
                  </td>
                  <td className="font-medium text-xs">{pedido.moneda}</td>
                  <td className="text-mist text-xs">{pedido._count?.lineas}</td>
                </tr>
              );
            })}
          </tbody>
        </TableContainer>
      </TableCard>
    </div>
  );
}
