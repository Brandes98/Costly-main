import { useMemo, useState } from 'react';
import Spinner, { EmptyState } from '../../components/ui/Spinner';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { useImportaciones } from '../../hooks/useApi';
import { fmtDate } from '../../lib/utils';

const estadoLabel = {
  borrador: 'Borrador',
  en_proceso: 'En proceso',
  en_transito: 'En tránsito',
  en_aduana: 'En aduana',
  en_bodega: 'En bodega',
  cerrada: 'Cerrada',
};

const estadoPill = {
  borrador: 'pill-gray',
  en_proceso: 'pill-blue',
  en_transito: 'pill-blue',
  en_aduana: 'pill-yellow',
  en_bodega: 'pill-green',
  cerrada: 'pill-violet',
};

const semaforoByEstado = {
  borrador: 's3y',
  en_proceso: 's3y',
  en_transito: 's3r',
  en_aduana: 's3y',
  en_bodega: 's3g',
  cerrada: 's3g',
};

function resumenPedidos(pedidos = []) {
  return pedidos.map((pedido) => pedido.codigo).join(' + ');
}

function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map((pedido) => pedido.proveedor?.nombre).filter(Boolean))];
}

export default function ImportacionesPage() {
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const {
    data: importaciones = [],
    isLoading,
    isError,
  } = useImportaciones({
    estado: estado || undefined,
  });

  const estadoOptions = useMemo(
    () => [
      { value: 'en_proceso', label: 'En proceso' },
      { value: 'en_transito', label: 'En tránsito' },
      { value: 'en_aduana', label: 'En aduana' },
      { value: 'en_bodega', label: 'En bodega' },
      { value: 'cerrada', label: 'Cerrada' },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      importaciones.map((importacion) => {
        const proveedores = resumenProveedores(importacion.pedidos);
        return {
          ...importacion,
          proveedores,
          pedidosResumen: resumenPedidos(importacion.pedidos),
          pedidosCount: importacion._count?.pedidos ?? importacion.pedidos?.length ?? 0,
          costeoEstado: importacion._count?.costeos > 0 ? 'Registrado' : 'Pendiente',
        };
      }),
    [importaciones],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return rows;

    return rows.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(normalizedSearch) ||
        item.pedidosResumen?.toLowerCase().includes(normalizedSearch) ||
        item.proveedores?.some((proveedor) => proveedor.toLowerCase().includes(normalizedSearch)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4 w-full min-w-0">
      {isError && (
        <div className="rounded-card border border-rs/20 bg-rs-l px-4 py-3 text-xs text-rs">
          No pudimos cargar las importaciones del backend.
        </div>
      )}

      <TableToolbar
        enableSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar importación..."
        showEstadoFilter
        estadoValue={estado}
        onEstadoChange={setEstado}
        estadoOptions={estadoOptions}
      />

      <TableCard
        title="🚢 Importaciones consolidadas"
        countLabel={`${filteredRows.length} importaciones activas`}
        loading={isLoading}
        isEmpty={filteredRows.length === 0}
        emptyMessage="No hay importaciones que mostrar"
      >
        <TableContainer minWidth="min-w-[920px]">
          <thead>
            <tr>
              <th className="w-6" />
              <th>Código</th>
              <th>Pedidos agrupados</th>
              <th>Pedidos</th>
              <th>Contenedor</th>
              <th>Estado</th>
              <th>Fecha unión</th>
              <th>Costeo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((item) => (
              <tr key={item.importacion_id}>
                <td className="pl-3">
                  <span className={`s3 ${semaforoByEstado[item.estado] || 's3y'}`} />
                </td>
                <td>
                  <strong>{item.codigo}</strong>
                  <div className="text-[10px] text-tl">{item.pedidosResumen || 'Sin pedidos'}</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {item.proveedores.length > 0 ? (
                      item.proveedores.map((proveedor) => (
                        <span key={`${item.importacion_id}-${proveedor}`} className="ic">
                          {proveedor}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-mist">Sin proveedor</span>
                    )}
                  </div>
                </td>
                <td className="text-center font-semibold">{item.pedidosCount}</td>
                <td className="text-[11px] text-mist">Pendiente</td>
                <td>
                  <span className={`pill ${estadoPill[item.estado] || 'pill-gray'}`}>
                    {estadoLabel[item.estado] || item.estado}
                  </span>
                </td>
                <td className="text-[11px] text-mist">
                  {fmtDate(item.fecha_union || item.creado_en)}
                </td>
                <td>
                  <span
                    className={`pill ${item.costeoEstado === 'Registrado' ? 'pill-green' : 'pill-yellow'}`}
                  >
                    {item.costeoEstado}
                  </span>
                </td>
                <td>
                  <button className="btn btn-outline text-xs whitespace-nowrap">Ver detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>
    </div>
  );
}
