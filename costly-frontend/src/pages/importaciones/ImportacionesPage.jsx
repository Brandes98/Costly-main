import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner, { EmptyState } from '../../components/ui/Spinner';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { useImportaciones } from '../../hooks/useApi';
import {
  fmtDate,
  importacionEstadoOptions,
  importacionEstadoPillClass,
  importacionSemaforoClass,
  importacionEstadoLabel,
} from '../../lib/utils';

function resumenPedidos(pedidos = []) {
  return pedidos.map((pedido) => pedido.codigo).join(' + ');
}

function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map((pedido) => pedido.proveedor?.nombre).filter(Boolean))];
}

export default function ImportacionesPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const {
    data: importaciones = [],
    isLoading,
    isError,
  } = useImportaciones({
    estado: estado || undefined,
  });

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
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar importación..."
        estadoValue={estado}
        onEstadoChange={setEstado}
        estadoOptions={importacionEstadoOptions}
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
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((item) => (
              <tr
                key={item.importacion_id}
                className="cursor-pointer"
                onClick={() => navigate(`/importaciones/${item.importacion_id}`)}
              >
                <td className="pl-3">
                  <span className={`s3 ${importacionSemaforoClass(item.estado)}`} />
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
                  <span className={`pill ${importacionEstadoPillClass(item.estado)}`}>
                    {importacionEstadoLabel(item.estado)}
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
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>
    </div>
  );
}
