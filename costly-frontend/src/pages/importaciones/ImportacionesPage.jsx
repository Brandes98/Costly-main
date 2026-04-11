import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner, { EmptyState } from '../../components/ui/Spinner';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { useImportaciones, usePedidos } from '../../hooks/useApi';
import api from '../../lib/api';
import {
  fmtDate,
  importacionEstadoOptions,
  importacionEstadoPillClass,
  importacionSemaforoClass,
  importacionEstadoLabel,
} from '../../lib/utils';

function resumenPedidos(pedidos = []) {
  return pedidos.map((p) => p.codigo).join(' + ');
}
function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map((p) => p.proveedor?.nombre).filter(Boolean))];
}

export default function ImportacionesPage() {
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const [estado,     setEstado]     = useState('');
  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [selIds,     setSelIds]     = useState([]);
  const [nota,       setNota]       = useState('');

  const { data: importaciones = [], isLoading, isError } = useImportaciones({ estado: estado || undefined });
  const { data: pedidosSinImp = [], isLoading: loadingPedidos } = usePedidos({ sin_importacion: 'true' });

  const { mutate: crearImportacion, isPending: creando } = useMutation({
    mutationFn: (data) => api.post('/pedidos/unir', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importaciones'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      setModalOpen(false);
      setSelIds([]);
      setNota('');
    },
  });

  const rows = useMemo(() =>
    importaciones.map((imp) => ({
      ...imp,
      proveedores:    resumenProveedores(imp.pedidos),
      pedidosResumen: resumenPedidos(imp.pedidos),
      pedidosCount:   imp._count?.pedidos ?? imp.pedidos?.length ?? 0,
      costeoEstado:   imp._count?.costeos > 0 ? 'Registrado' : 'Pendiente',
    })),
  [importaciones]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(item =>
      item.codigo?.toLowerCase().includes(q) ||
      item.pedidosResumen?.toLowerCase().includes(q) ||
      item.proveedores?.some(p => p.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const togglePedido = (id) =>
    setSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCrear = () => {
    if (selIds.length === 0) return;
    crearImportacion({ pedido_ids: selIds, nota: nota || undefined });
  };

  const cerrarModal = () => { setModalOpen(false); setSelIds([]); setNota(''); };

  return (
    <div className="space-y-4 w-full min-w-0">

      {isError && (
        <div className="rounded-card border border-rs/20 bg-rs-l px-4 py-3 text-xs text-rs">
          No pudimos cargar las importaciones del backend.
        </div>
      )}

      {/* Toolbar + botón */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar importación..."
            estadoValue={estado}
            onEstadoChange={setEstado}
            estadoOptions={importacionEstadoOptions}
          />
        </div>
        <button className="btn btn-primary text-xs shrink-0" onClick={() => setModalOpen(true)}>
          ＋ Nueva importación
        </button>
      </div>

      {/* Tabla */}
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
                    {item.proveedores.length > 0
                      ? item.proveedores.map(p => (
                          <span key={`${item.importacion_id}-${p}`} className="ic">{p}</span>
                        ))
                      : <span className="text-xs text-mist">Sin proveedor</span>
                    }
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
                  <span className={`pill ${item.costeoEstado === 'Registrado' ? 'pill-green' : 'pill-yellow'}`}>
                    {item.costeoEstado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      {/* ── MODAL NUEVA IMPORTACIÓN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-lg rounded-card border border-border bg-sur shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="font-semibold text-ink">Nueva importación</div>
                <div className="text-xs text-mist">Seleccioná uno o más pedidos</div>
              </div>
              <button className="text-mist hover:text-ink transition-colors" onClick={cerrarModal}>✕</button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-4 max-h-[65vh] overflow-y-auto">

              <div className="rounded-card border border-tl/20 bg-tl-xl px-3 py-2 text-xs text-slate">
                Un solo pedido → <strong className="text-tl">importación individual</strong>.
                Dos o más → <strong className="text-tl">importación consolidada</strong>.
              </div>

              {/* Lista pedidos */}
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-mist">
                  Pedidos disponibles ({pedidosSinImp.length})
                </div>
                {loadingPedidos ? (
                  <div className="flex justify-center py-6"><Spinner /></div>
                ) : pedidosSinImp.length === 0 ? (
                  <div className="rounded-card border border-border py-6 text-center text-xs text-mist">
                    No hay pedidos sin importación asignada
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pedidosSinImp.map(p => {
                      const sel = selIds.includes(p.pedido_id);
                      return (
                        <div
                          key={p.pedido_id}
                          onClick={() => togglePedido(p.pedido_id)}
                          className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2.5 transition-all
                            ${sel ? 'border-tl bg-tl-xl' : 'border-border bg-sur hover:border-tl/40'}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2
                              ${sel ? 'border-tl bg-tl' : 'border-border'}`}>
                              {sel && <span className="text-[9px] font-bold text-white">✓</span>}
                            </div>
                            <div>
                              <div className="text-xs font-medium">{p.codigo}</div>
                              <div className="text-[10px] text-mist">
                                {p.proveedor?.nombre || '—'} · {p._count?.lineas ?? p.lineas?.length ?? 0} líneas
                              </div>
                            </div>
                          </div>
                          <span className={`pill ${p.estado === 'confirmado' ? 'pill-green' : 'pill-yellow'}`}>
                            {p.estado}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Nota */}
              <div>
                <label className="form-label">Nota (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Consolidado por espacio en contenedor"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                />
              </div>

              {/* Resumen */}
              {selIds.length > 0 && (
                <div className="rounded-card border border-border bg-sur2 px-3 py-2 text-xs space-y-1">
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

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button className="btn btn-outline text-xs" onClick={cerrarModal}>Cancelar</button>
              <button
                className="btn btn-primary text-xs"
                onClick={handleCrear}
                disabled={selIds.length === 0 || creando}
              >
                {creando
                  ? 'Creando...'
                  : `Crear importación${selIds.length > 0 ? ` (${selIds.length} pedido${selIds.length > 1 ? 's' : ''})` : ''}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
