import { useMemo, useState } from 'react';
import { EmptyState, Modal } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import {
  useConfirmPago,
  useCreatePago,
  usePagos,
  usePedidos,
  useProveedores,
} from '../../hooks/useApi';
import { fmtCurrency, fmtDate } from '../../lib/utils';

const initialForm = {
  pedido_id: '',
  proveedor_id: '',
  tipo: 'senal',
  monto: '',
  moneda: 'USD',
  fecha_pago: '',
  fecha_limite: '',
  metodo: 'swift',
  referencia: '',
  comprobante_url: '',
};

const pillClassByEstado = {
  programado: 'pill-yellow',
  procesado: 'pill-blue',
  confirmado: 'pill-green',
  devuelto: 'pill-red',
};

const tipoLabel = {
  senal: 'Señal',
  saldo: 'Saldo',
  total: 'Total',
  anticipo: 'Anticipo',
  devolucion: 'Devolución',
};

const metodoLabel = {
  swift: 'SWIFT',
  transferencia_local: 'Transferencia local',
  cheque: 'Cheque',
  efectivo: 'Efectivo',
};

function toIsoDate(dateString) {
  if (!dateString) return undefined;
  return new Date(`${dateString}T00:00:00.000Z`).toISOString();
}

function daysUntil(dateString) {
  if (!dateString) return '—';

  const today = new Date();
  const target = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = Math.round((target - today) / 86400000);
  if (diff < 0) return `Vencido hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'}`;
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  return `En ${diff} días`;
}

function normalizePago(pago, proveedoresMap) {
  const proveedor = proveedoresMap.get(pago.proveedor_id);
  return {
    ...pago,
    codigo: pago.pedido?.codigo ?? `Pedido #${pago.pedido_id}`,
    proveedor_nombre:
      pago.proveedor?.nombre ?? proveedor?.nombre ?? `Proveedor #${pago.proveedor_id}`,
    proveedor_bandera: proveedor?.pais?.bandera ?? '',
    monto: Number(pago.monto ?? 0),
  };
}

export default function PagosPage() {
  const [filters, setFilters] = useState({ estado: '', proveedor_id: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const {
    data: pagosData = [],
    isLoading: loadingPagos,
    isError: pagosError,
  } = usePagos({
    estado: filters.estado || undefined,
    proveedor_id: filters.proveedor_id || undefined,
  });
  const { data: pedidos = [], isLoading: loadingPedidos } = usePedidos();
  const { data: proveedores = [], isLoading: loadingProveedores } = useProveedores();

  const { mutate: crearPago, isPending: creandoPago } = useCreatePago();
  const { mutate: confirmarPago, isPending: confirmandoPago } = useConfirmPago();

  const proveedoresMap = useMemo(
    () => new Map(proveedores.map((proveedor) => [proveedor.proveedor_id, proveedor])),
    [proveedores],
  );

  const pedidosConProveedor = useMemo(
    () =>
      pedidos.map((pedido) => ({
        ...pedido,
        proveedor: pedido.proveedor ?? proveedoresMap.get(pedido.proveedor_id),
      })),
    [pedidos, proveedoresMap],
  );

  const pagos = useMemo(
    () => pagosData.map((pago) => normalizePago(pago, proveedoresMap)),
    [pagosData, proveedoresMap],
  );

  const stats = useMemo(() => {
    return {
      pendiente: pagos
        .filter((pago) => !['confirmado', 'devuelto'].includes(pago.estado))
        .reduce((acc, pago) => acc + pago.monto, 0),
      programado: pagos
        .filter((pago) => pago.estado === 'programado')
        .reduce((acc, pago) => acc + pago.monto, 0),
      confirmado: pagos
        .filter((pago) => pago.estado === 'confirmado')
        .reduce((acc, pago) => acc + pago.monto, 0),
      proximos: pagos.filter((pago) => {
        if (pago.estado === 'confirmado' || !pago.fecha_limite) return false;
        const label = daysUntil(pago.fecha_limite);
        return label === 'Hoy' || label === 'Mañana' || label.startsWith('En ');
      }).length,
      total: pagos.reduce((acc, pago) => acc + pago.monto, 0),
    };
  }, [pagos]);

  const loading = loadingPagos || loadingPedidos || loadingProveedores;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === 'pedido_id') {
        const pedido = pedidosConProveedor.find((item) => String(item.pedido_id) === value);
        if (pedido) {
          next.proveedor_id = String(pedido.proveedor_id);
          next.moneda = pedido.moneda ?? current.moneda;
        }
      }

      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      pedido_id: Number(form.pedido_id),
      proveedor_id: Number(form.proveedor_id),
      tipo: form.tipo,
      monto: Number(form.monto),
      moneda: form.moneda,
      fecha_pago: toIsoDate(form.fecha_pago),
      fecha_limite: toIsoDate(form.fecha_limite),
      metodo: form.metodo || undefined,
      referencia: form.referencia || undefined,
      comprobante_url: form.comprobante_url || undefined,
    };

    crearPago(payload, {
      onSuccess: () => {
        setForm(initialForm);
        setModalOpen(false);
      },
    });
  };

  const pedidoSeleccionado = pedidosConProveedor.find(
    (pedido) => String(pedido.pedido_id) === String(form.pedido_id),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-serif text-xl font-medium text-ink">Pagos a proveedores</div>
          <div className="text-[11px] text-mist">Finanzas / Pagos</div>
        </div>
        <button className="btn btn-primary text-xs" onClick={() => setModalOpen(true)}>
          + Registrar pago
        </button>
      </div>

      {pagosError && (
        <div className="rounded-card border border-rs/20 bg-rs-l px-4 py-3 text-xs text-rs">
          No pudimos cargar los pagos del backend.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="kpi">
          <div className="text-2xl font-bold text-rs">{fmtCurrency(stats.pendiente)}</div>
          <div className="text-[11px] text-mist">Saldo pendiente</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-am">{fmtCurrency(stats.programado)}</div>
          <div className="text-[11px] text-mist">Pagos programados</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-sg">{fmtCurrency(stats.confirmado)}</div>
          <div className="text-[11px] text-mist">Pagado completo</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-rs">{stats.proximos}</div>
          <div className="text-[11px] text-mist">Vencen pronto</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-ink">{fmtCurrency(stats.total)}</div>
          <div className="text-[11px] text-mist">Total comprometido</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Pagos registrados</div>
          <div className="flex gap-2">
            <select
              className="form-input h-8 min-w-36"
              value={filters.estado}
              onChange={(e) => setFilters((current) => ({ ...current, estado: e.target.value }))}
            >
              <option value="">Todos los estados</option>
              <option value="programado">Programado</option>
              <option value="procesado">Procesado</option>
              <option value="confirmado">Confirmado</option>
              <option value="devuelto">Devuelto</option>
            </select>
            <select
              className="form-input h-8 min-w-44"
              value={filters.proveedor_id}
              onChange={(e) =>
                setFilters((current) => ({ ...current, proveedor_id: e.target.value }))
              }
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.proveedor_id} value={proveedor.proveedor_id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pagos.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No hay pagos para mostrar"
            description="Cuando registres pagos en el backend, te van a aparecer acá."
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-6" />
                <th>Pedido</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Fecha pago</th>
                <th>Fecha límite</th>
                <th>Método</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.pago_id}>
                  <td className="pl-3">
                    <span
                      className={`s3 ${
                        pago.estado === 'confirmado'
                          ? 's3g'
                          : pago.estado === 'devuelto'
                            ? 's3r'
                            : 's3y'
                      }`}
                    />
                  </td>
                  <td>
                    <strong>{pago.codigo}</strong>
                  </td>
                  <td>
                    <span className="ic">
                      {pago.proveedor_bandera} {pago.proveedor_nombre}
                    </span>
                  </td>
                  <td>
                    <span className="pill pill-gray">{tipoLabel[pago.tipo] || pago.tipo}</span>
                  </td>
                  <td className="font-semibold">{fmtCurrency(pago.monto, pago.moneda)}</td>
                  <td className="text-[11px] text-mist">{fmtDate(pago.fecha_pago)}</td>
                  <td className="text-[11px] font-medium">{daysUntil(pago.fecha_limite)}</td>
                  <td className="text-[11px] text-mist">{metodoLabel[pago.metodo] || '—'}</td>
                  <td>
                    <span className={`pill ${pillClassByEstado[pago.estado] || 'pill-gray'}`}>
                      {pago.estado}
                    </span>
                  </td>
                  <td>
                    {pago.estado !== 'confirmado' && (
                      <button
                        className="btn btn-primary text-xs"
                        disabled={confirmandoPago}
                        onClick={() => confirmarPago(pago.pago_id)}
                      >
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setForm(initialForm);
        }}
        title="Registrar pago"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setModalOpen(false);
                setForm(initialForm);
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              form="pago-form"
              type="submit"
              disabled={creandoPago}
            >
              {creandoPago ? 'Guardando...' : 'Registrar pago'}
            </button>
          </>
        }
      >
        <form
          id="pago-form"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div>
            <div className="mb-1 text-xs text-mist">Pedido</div>
            <select
              className="form-input"
              name="pedido_id"
              value={form.pedido_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar...</option>
              {pedidosConProveedor.map((pedido) => (
                <option key={pedido.pedido_id} value={pedido.pedido_id}>
                  {pedido.codigo} -{' '}
                  {pedido.proveedor?.nombre || `Proveedor #${pedido.proveedor_id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Proveedor</div>
            <select
              className="form-input"
              name="proveedor_id"
              value={form.proveedor_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar...</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.proveedor_id} value={proveedor.proveedor_id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Tipo</div>
            <select className="form-input" name="tipo" value={form.tipo} onChange={handleChange}>
              <option value="senal">Señal</option>
              <option value="saldo">Saldo</option>
              <option value="total">Total</option>
              <option value="anticipo">Anticipo</option>
              <option value="devolucion">Devolución</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Monto</div>
            <input
              className="form-input"
              name="monto"
              type="number"
              min="0"
              step="0.01"
              value={form.monto}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Moneda</div>
            <select
              className="form-input"
              name="moneda"
              value={form.moneda}
              onChange={handleChange}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CRC">CRC</option>
              <option value="CNY">CNY</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Método</div>
            <select
              className="form-input"
              name="metodo"
              value={form.metodo}
              onChange={handleChange}
            >
              <option value="swift">SWIFT</option>
              <option value="transferencia_local">Transferencia local</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Fecha de pago</div>
            <input
              className="form-input"
              name="fecha_pago"
              type="date"
              value={form.fecha_pago}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Fecha límite</div>
            <input
              className="form-input"
              name="fecha_limite"
              type="date"
              value={form.fecha_limite}
              onChange={handleChange}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-mist">Referencia</div>
            <input
              className="form-input"
              name="referencia"
              value={form.referencia}
              onChange={handleChange}
              placeholder="Número de transferencia"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-mist">URL comprobante</div>
            <input
              className="form-input"
              name="comprobante_url"
              type="url"
              value={form.comprobante_url}
              onChange={handleChange}
              placeholder="https://drive.google.com/..."
            />
          </div>

          {pedidoSeleccionado && (
            <div className="md:col-span-2 rounded-lg bg-sur2 px-3 py-2 text-xs text-mist">
              Pedido seleccionado:{' '}
              <span className="font-medium text-ink">{pedidoSeleccionado.codigo}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
