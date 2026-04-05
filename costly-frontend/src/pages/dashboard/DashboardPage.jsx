import { useReporteR01, useTCHoy, useHitos } from '../../hooks/useApi';
import { KpiCard, Semaforo, Pill } from '../../components/ui/Spinner';
import {
  fmtCurrency,
  fmtDate,
  estadoPillClass,
  estadoLabel,
  getSemaforo,
  semaforoClass,
} from '../../lib/utils';
import Spinner from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { data: pedidos = [], isLoading: loadingPedidos } = useReporteR01();
  const { data: tc } = useTCHoy();
  const { data: hitosData } = useHitos({ estado: 'pendiente' });
  const hitos = hitosData || [];

  // KPIs calculados
  const activos = pedidos.filter((p) => !['cerrado', 'cancelado'].includes(p.estado)).length;
  const transito = pedidos.filter((p) =>
    ['embarcado', 'en_transito', 'en_puerto_cr'].includes(p.estado),
  ).length;
  const alertas = hitos.filter((h) => getSemaforo(h.fecha_plan) === 'red').length;
  const enAduana = pedidos.filter((p) => p.estado === 'en_aduana').length;

  if (loadingPedidos) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          icon="📦"
          value={activos}
          label="Pedidos activos"
          delta="Total en proceso"
          deltaUp
          variant="tl"
        />
        <KpiCard
          icon="🚢"
          value={transito}
          label="En tránsito"
          delta="En camino a CR"
          deltaUp
          variant="gd"
        />
        <KpiCard
          icon="⏳"
          value={alertas}
          label="Alertas vencidas"
          delta="Requieren atención"
          variant="rs"
        />
        <KpiCard
          icon="🏛️"
          value={enAduana}
          label="En aduana/fiscal"
          delta="Trámite pendiente"
          variant="sg"
        />
      </div>

      {/* TC del día */}
      {tc && (
        <div className="bg-tl-xl border border-tl/20 rounded-card px-4 py-2.5 flex items-center gap-3 text-xs">
          <span className="text-tl font-semibold">💱 TC del día:</span>
          <span className="font-bold text-ink">
            ₡{Number(tc.usd_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })} / USD
          </span>
          <span className="text-mist">·</span>
          <span className="text-mist">Fuente: {tc.fuente?.toUpperCase()}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Tabla de pedidos activos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Pedidos activos — Semáforo</div>
            <div className="flex gap-3 text-[10.5px] text-mist">
              <span className="flex items-center gap-1">
                <span className="s3 s3g" />
                OK
              </span>
              <span className="flex items-center gap-1">
                <span className="s3 s3y" />
                Pronto
              </span>
              <span className="flex items-center gap-1">
                <span className="s3 s3r" />
                Vencido
              </span>
            </div>
          </div>
          {pedidos.length === 0 ? (
            <div className="p-8 text-center text-mist text-xs">No hay pedidos activos</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl min-w-[720px]">
                <thead>
                  <tr>
                    <th className="w-6" />
                    <th>Pedido</th>
                    <th>Proveedor</th>
                    <th>Estado</th>
                    <th>Próx. Hito</th>
                    <th>Moneda</th>
                    <th>Pago prov.</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.slice(0, 8).map((p) => {
                    const hito = p.hitos?.[0];
                    const sem = hito ? getSemaforo(hito.fecha_plan) : 'green';
                    return (
                      <tr
                        key={p.pedido_id}
                        className="cursor-pointer"
                        onClick={() => (window.location.href = `/pedidos/${p.pedido_id}`)}
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
                          <span className={`pill ${estadoPillClass(p.estado)}`}>
                            {estadoLabel(p.estado)}
                          </span>
                        </td>
                        <td className="text-[11px]">
                          {hito ? (
                            <span
                              className={
                                sem === 'red'
                                  ? 'text-rs font-medium'
                                  : sem === 'yellow'
                                    ? 'text-am font-medium'
                                    : 'text-mist'
                              }
                            >
                              {fmtDate(hito.fecha_plan)}
                            </span>
                          ) : (
                            <span className="text-mist">—</span>
                          )}
                        </td>
                        <td className="font-medium">{p.moneda}</td>
                        <td>
                          <span className="pill pill-gray">{p._count?.lineas} líneas</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          {/* Alertas */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                🔔 Alertas
                {alertas > 0 && (
                  <span className="bg-rs-l text-rs text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold ml-1">
                    {alertas}
                  </span>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {hitos.slice(0, 5).map((h) => {
                const sem = getSemaforo(h.fecha_plan);
                return (
                  <div
                    key={h.hito_id}
                    className="flex gap-2 items-start px-4 py-2.5 border-b border-border-lt last:border-b-0"
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${sem === 'red' ? 'bg-rs-l' : 'bg-gd-l'}`}
                    >
                      {sem === 'red' ? '🚨' : '⏰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">
                        {h.pedido?.codigo} — {h.tipo?.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10.5px] text-mist">{fmtDate(h.fecha_plan)}</div>
                    </div>
                  </div>
                );
              })}
              {hitos.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-mist">
                  ✅ Sin alertas pendientes
                </div>
              )}
            </div>
          </div>

          {/* Pedidos por estado */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📊 Por estado</div>
            </div>
            <div className="card-body flex flex-col gap-2">
              {[
                { label: 'En tránsito', key: ['embarcado', 'en_transito'], color: 'bg-tl' },
                { label: 'En producción', key: ['en_produccion'], color: 'bg-gd' },
                { label: 'En aduana', key: ['en_aduana', 'en_puerto_cr'], color: 'bg-rs' },
                { label: 'Confirmados', key: ['confirmado'], color: 'bg-slate' },
                { label: 'Borradores', key: ['borrador'], color: 'bg-border' },
              ].map(({ label, key, color }) => {
                const count = pedidos.filter((p) => key.includes(p.estado)).length;
                const pct = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[11.5px] w-28 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-mist w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
