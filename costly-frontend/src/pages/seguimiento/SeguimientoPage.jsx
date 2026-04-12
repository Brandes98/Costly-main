import { useState } from 'react';
import { useHitos, useCreateHito, useUpdateHito, usePedidos, useUsuarios } from '../../hooks/useApi';
import {
  estadoLabel,
  estadoPillClass,
  hitoTipoLabel,
  hitoTipoOptions,
  hitoEstadoOptions,
  hitoEstadoPillClass,
  hitoEstadoLabel,
  hitoDotClass,
  hitoSubtitulo,
} from '../../lib/utils';
import Spinner from '../../components/ui/Spinner';

// ── Sub-components ─────────────────────────────────────────
function HitoRow({ hito, onCompletar }) {
  const sub = hitoSubtitulo(hito);
  const isPending = hito.estado === 'pendiente';

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border-lt last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={hitoDotClass(hito.estado)}
          style={isPending ? { background: 'var(--border)' } : undefined}
        />
        <div className="min-w-0">
          <div className={`text-xs font-medium truncate ${isPending ? 'text-mist' : 'text-ink'}`}>
            {hitoTipoLabel(hito.tipo)}
          </div>
          {sub && (
            <div className="text-[10.5px]" style={{ color: sub.color }}>
              {sub.text}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`pill ${hitoEstadoPillClass(hito.estado)}`}>
          {hitoEstadoLabel(hito.estado)}
        </span>
        {hito.estado === 'en_proceso' && (
          <button className="btn btn-outline" onClick={() => onCompletar(hito.hito_id)}>
            ✓ Completar
          </button>
        )}
      </div>
    </div>
  );
}

function PedidoCard({ pedido, hitos, onCompletar }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🎯 {pedido.codigo} — {pedido.proveedor?.nombre ?? '—'}
        </div>
        <span className={`pill ${estadoPillClass(pedido.estado)}`}>
          {estadoLabel(pedido.estado)}
        </span>
      </div>
      <div className="px-4">
        {hitos.length === 0 ? (
          <p className="py-4 text-xs text-mist">Sin hitos registrados</p>
        ) : (
          hitos.map((hito) => (
            <HitoRow key={hito.hito_id} hito={hito} onCompletar={onCompletar} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────
const EMPTY_FORM = { pedido_id: '', tipo: 'confirmacion', fecha_plan: '', responsable_id: '' };

export default function SeguimientoPage() {
  const [pedidoFilter, setPedidoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: hitos = [], isLoading } = useHitos({
    ...(pedidoFilter && { pedido_id: pedidoFilter }),
    ...(estadoFilter && { estado: estadoFilter }),
  });

  const { data: pedidos = [] } = usePedidos();
  const { data: usuarios = [] } = useUsuarios();

  const updateHito = useUpdateHito();
  const createHito = useCreateHito();

  const pedidoMap = Object.fromEntries(pedidos.map((p) => [p.pedido_id, p]));

  const grouped = hitos.reduce((acc, hito) => {
    const pid = hito.pedido_id;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(hito);
    return acc;
  }, {});

  const pedidosConHitos = Object.keys(grouped).map(Number);

  const handleCompletar = (hitoId) => {
    updateHito.mutate({ id: hitoId, estado: 'completado' });
  };

  const handleAgregarHito = () => {
    if (!form.pedido_id || !form.tipo) return;
    createHito.mutate(
      {
        pedido_id: Number(form.pedido_id),
        tipo: form.tipo,
        ...(form.fecha_plan && { fecha_plan: new Date(form.fecha_plan).toISOString() }),
        ...(form.responsable_id && { responsable_id: Number(form.responsable_id) }),
      },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  };

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">Seguimiento de Hitos</div>
          <div className="text-[11px] text-mist">Operaciones › Seguimiento</div>
        </div>
        <div className="flex gap-2">
          <select
            className="form-input h-8 text-xs w-44"
            value={pedidoFilter}
            onChange={(e) => setPedidoFilter(e.target.value)}
          >
            <option value="">Todos los pedidos</option>
            {pedidos.map((p) => (
              <option key={p.pedido_id} value={p.pedido_id}>
                {p.codigo}
              </option>
            ))}
          </select>
          <select
            className="form-input h-8 text-xs w-40"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {hitoEstadoOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Pedido cards */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {pedidosConHitos.length === 0 ? (
              <div className="card">
                <p className="p-8 text-center text-xs text-mist">No hay hitos para mostrar</p>
              </div>
            ) : (
              pedidosConHitos.map((pid) => (
                <PedidoCard
                  key={pid}
                  pedido={
                    pedidoMap[pid] ?? {
                      pedido_id: pid,
                      codigo: `Pedido ${pid}`,
                      proveedor: null,
                      estado: 'confirmado',
                    }
                  }
                  hitos={grouped[pid]}
                  onCompletar={handleCompletar}
                />
              ))
            )}
          </div>

          {/* Add hito form */}
          <div className="card w-72 flex-shrink-0">
            <div className="card-header">
              <div className="card-title">➕ Agregar hito</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Pedido</label>
                <select className="form-input" value={form.pedido_id} onChange={field('pedido_id')}>
                  <option value="">Seleccionar...</option>
                  {pedidos.map((p) => (
                    <option key={p.pedido_id} value={p.pedido_id}>
                      {p.codigo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de hito</label>
                <select className="form-input" value={form.tipo} onChange={field('tipo')}>
                  {hitoTipoOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha plan</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.fecha_plan}
                  onChange={field('fecha_plan')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Responsable</label>
                <select
                  className="form-input"
                  value={form.responsable_id}
                  onChange={field('responsable_id')}
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.usuario_id} value={u.usuario_id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary w-full justify-center"
                disabled={!form.pedido_id || !form.tipo || createHito.isPending}
                onClick={handleAgregarHito}
              >
                {createHito.isPending ? 'Guardando...' : 'Agregar hito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
