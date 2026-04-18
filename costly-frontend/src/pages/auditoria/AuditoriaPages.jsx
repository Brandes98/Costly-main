import { useState } from 'react';
import { useAuditoria, useUsuarios } from '../../hooks/useApi';
import { TableCard, TableContainer } from '../../components/ui/Table';
import {
  accionAuditoriaPillClass,
  auditoriaAccionOptions,
  auditoriaEntidadOptions,
  entidadTipoLabel,
  fmtJsonValue,
  fmtDate,
} from '../../lib/utils';


const EMPTY_DRAFT = { entidad_tipo: '', accion: '', usuario_id: '', desde: '', hasta: '' };

export default function AuditoriaPage() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [active, setActive] = useState({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditoria({ ...active, page });
  const { data: usuarios = [] } = useUsuarios();

  const registros = data?.registros ?? [];
  const meta      = data?.meta ?? {};

  const field = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const handleFiltrar = () => {
    const cleaned = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== ''));
    setActive(cleaned);
    setPage(1);
  };

  const handleLimpiar = () => {
    setDraft(EMPTY_DRAFT);
    setActive({});
    setPage(1);
  };

  const usuarioOptions = usuarios.map((u) => ({ value: String(u.usuario_id), label: u.nombre }));

  return (
    <div className="space-y-4">
      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-mist">Entidad</label>
          <select className="form-input h-8 text-xs w-36" value={draft.entidad_tipo} onChange={field('entidad_tipo')}>
            <option value="">Todas</option>
            {auditoriaEntidadOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-mist">Acción</label>
          <select className="form-input h-8 text-xs w-32" value={draft.accion} onChange={field('accion')}>
            <option value="">Todas</option>
            {auditoriaAccionOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-mist">Usuario</label>
          <select className="form-input h-8 text-xs w-40" value={draft.usuario_id} onChange={field('usuario_id')}>
            <option value="">Todos</option>
            {usuarioOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-mist">Desde</label>
          <input type="date" className="form-input h-8 text-xs w-36" value={draft.desde} onChange={field('desde')} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-mist">Hasta</label>
          <input type="date" className="form-input h-8 text-xs w-36" value={draft.hasta} onChange={field('hasta')} />
        </div>

        <button className="btn btn-primary btn-sm h-8" onClick={handleFiltrar}>Filtrar</button>
        <button className="btn btn-outline btn-sm h-8" onClick={handleLimpiar}>Limpiar</button>
      </div>

      {/* ── Tabla ── */}
      <TableCard
        title="🔍 Registros de auditoría"
        countLabel={meta.total != null ? `${meta.total} registros` : undefined}
        loading={isLoading}
        isEmpty={!isLoading && registros.length === 0}
        emptyMessage="No hay registros de auditoría"
      >
        <TableContainer minWidth="min-w-[960px]">
          <thead>
            <tr>
              <th>Quién</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>ID</th>
              <th>Campo</th>
              <th>Antes</th>
              <th>Después</th>
              <th>IP</th>
              <th>Cuándo</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.audit_id}>
                <td>{r.usuario?.nombre ?? `Usuario #${r.usuario_id}`}</td>
                <td>
                  <span className={`pill ${accionAuditoriaPillClass(r.accion)}`}>
                    {r.accion}
                  </span>
                </td>
                <td className="text-mist text-[11px]">{entidadTipoLabel(r.entidad_tipo)}</td>
                <td className="text-[11px]">{r.entidad_id != null ? `#${r.entidad_id}` : '—'}</td>
                <td className="text-[11px] text-mist">{r.campo ?? '—'}</td>
                <td className="text-[11px] text-mist">{fmtJsonValue(r.valor_antes)}</td>
                <td className="text-[11px] text-mist">{fmtJsonValue(r.valor_despues)}</td>
                <td className="text-[10px] text-mist">{r.ip ?? '—'}</td>
                <td className="text-[10.5px] text-mist">{fmtDate(r.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </TableContainer>

        {/* Paginación */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-t border-border">
            <button
              className="btn btn-outline btn-sm"
              disabled={!meta.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Ant.
            </button>
            <span className="text-[11px] text-mist">Página {meta.page} de {meta.totalPages}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Sig. ›
            </button>
          </div>
        )}
      </TableCard>
    </div>
  );
}
