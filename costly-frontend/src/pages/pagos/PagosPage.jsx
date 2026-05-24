import { useMemo, useState } from 'react';
import { EmptyState, Modal } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import {
  useConfirmPago,
  useCreatePago,
  usePagos,
  usePedidos,
  useProveedores,
} from '../../hooks/useApi';
import {
  fmtCurrency,
  fmtDate,
  pagoEstadoLabel,
  pagoEstadoOptions,
  pagoEstadoPillClass,
  pagoMetodoLabel,
  pagoTipoLabel,
} from '../../lib/utils';

const initialForm = {
  _modo: 'pedido',
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
    proveedor_nombre: pago.proveedor?.nombre ?? proveedor?.nombre ?? `Proveedor #${pago.proveedor_id}`,
    proveedor_bandera: proveedor?.pais?.bandera ?? '',
    monto: Number(pago.monto ?? 0),
  };
}

export default function PagosPage() {
  const [filters, setFilters] = useState({ estado: '', proveedor_id: '' });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const { data: pagosData = [], isLoading: loadingPagos, isError: pagosError } = usePagos({
    estado: filters.estado || undefined,
    proveedor_id: filters.proveedor_id || undefined,
  });
  const { data: pedidos = [], isLoading: loadingPedidos } = usePedidos();
  const { data: proveedores = [], isLoading: loadingProveedores } = useProveedores();

  const { mutate: crearPago, isPending: creandoPago } = useCreatePago();
  const { mutate: confirmarPago, isPending: confirmandoPago } = useConfirmPago();

  const proveedoresMap = useMemo(
    () => new Map(proveedores.map((p) => [p.proveedor_id, p])),
    [proveedores],
  );

  const pedidosConProveedor = useMemo(
    () => pedidos.map((p) => ({ ...p, proveedor: p.proveedor ?? proveedoresMap.get(p.proveedor_id) })),
    [pedidos, proveedoresMap],
  );

  const pagos = useMemo(
    () => pagosData.map((p) => normalizePago(p, proveedoresMap)),
    [pagosData, proveedoresMap],
  );

  const stats = useMemo(() => ({
    pendiente:  pagos.filter(p => !['confirmado','devuelto'].includes(p.estado)).reduce((a,p) => a + p.monto, 0),
    programado: pagos.filter(p => p.estado === 'programado').reduce((a,p) => a + p.monto, 0),
    confirmado: pagos.filter(p => p.estado === 'confirmado').reduce((a,p) => a + p.monto, 0),
    proximos:   pagos.filter(p => {
      if (p.estado === 'confirmado' || !p.fecha_limite) return false;
      const label = daysUntil(p.fecha_limite);
      return label === 'Hoy' || label === 'Mañana' || label.startsWith('En ');
    }).length,
    total: pagos.reduce((a,p) => a + p.monto, 0),
  }), [pagos]);

  const loading = loadingPagos || loadingPedidos || loadingProveedores;

  const proveedorOptions = useMemo(
    () => proveedores.map(p => ({ value: String(p.proveedor_id), label: p.nombre })),
    [proveedores],
  );

  const filteredPagos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pagos;
    return pagos.filter(p =>
      p.codigo?.toLowerCase().includes(q) ||
      p.proveedor_nombre?.toLowerCase().includes(q) ||
      pagoTipoLabel(p.tipo)?.toLowerCase().includes(q) ||
      pagoMetodoLabel(p.metodo).toLowerCase().includes(q) ||
      p.estado?.toLowerCase().includes(q),
    );
  }, [pagos, search]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'pedido_id') {
        const pedido = pedidosConProveedor.find(item => String(item.pedido_id) === value);
        if (pedido) {
          next.proveedor_id = String(pedido.proveedor_id);
          next.moneda = pedido.moneda ?? current.moneda;
        }
      }
      if (name === 'proveedor_id') {
        next.pedido_id = '';
      }
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      pedido_id:       Number(form.pedido_id),
      proveedor_id:    Number(form.proveedor_id),
      tipo:            form.tipo,
      monto:           Number(form.monto),
      moneda:          form.moneda,
      fecha_pago:      toIsoDate(form.fecha_pago),
      fecha_limite:    toIsoDate(form.fecha_limite),
      metodo:          form.metodo || undefined,
      referencia:      form.referencia || undefined,
      comprobante_url: form.comprobante_url || undefined,
    };
    crearPago(payload, {
      onSuccess: () => { setForm(initialForm); setModalOpen(false); },
    });
  };

  const pedidoSeleccionado = pedidosConProveedor.find(
    p => String(p.pedido_id) === String(form.pedido_id),
  );

  return (
    <div className="space-y-4">
      {pagosError && (
        <div className="rounded-card border border-rs/20 bg-rs-l px-4 py-3 text-xs text-rs">
          No pudimos cargar los pagos del backend.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="kpi"><div className="text-2xl font-bold text-rs">{fmtCurrency(stats.pendiente)}</div><div className="text-[11px] text-mist">Saldo pendiente</div></div>
        <div className="kpi"><div className="text-2xl font-bold text-am">{fmtCurrency(stats.programado)}</div><div className="text-[11px] text-mist">Pagos programados</div></div>
        <div className="kpi"><div className="text-2xl font-bold text-sg">{fmtCurrency(stats.confirmado)}</div><div className="text-[11px] text-mist">Pagado completo</div></div>
        <div className="kpi"><div className="text-2xl font-bold text-rs">{stats.proximos}</div><div className="text-[11px] text-mist">Vencen pronto</div></div>
        <div className="kpi"><div className="text-2xl font-bold text-ink">{fmtCurrency(stats.total)}</div><div className="text-[11px] text-mist">Total comprometido</div></div>
      </div>

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pago..."
        filters={[
          { value: filters.estado ?? '', onChange: v => setFilters(c => ({ ...c, estado: v })), options: pagoEstadoOptions, placeholder: 'Todos los estados' },
          { value: filters.proveedor_id ?? '', onChange: v => setFilters(c => ({ ...c, proveedor_id: v })), options: proveedorOptions, placeholder: 'Todos los proveedores', className: 'w-52' },
        ]}
        action={<Button icon="create" onClick={() => setModalOpen(true)}>Registrar pago</Button>}
      />

      <TableCard title="💳 Pagos registrados" countLabel={`${filteredPagos.length} pagos`} loading={loading} isEmpty={filteredPagos.length === 0} emptyMessage="No hay pagos que mostrar">
        <TableContainer>
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
            {filteredPagos.map((pago) => (
              <tr key={pago.pago_id}>
                <td className="pl-3">
                  <span className={`s3 ${pago.estado === 'confirmado' ? 's3g' : pago.estado === 'devuelto' ? 's3r' : 's3y'}`} />
                </td>
                <td><strong>{pago.codigo}</strong></td>
                <td><span className="ic">{pago.proveedor_bandera} {pago.proveedor_nombre}</span></td>
                <td><span className="pill pill-gray">{pagoTipoLabel(pago.tipo)}</span></td>
                <td className="font-semibold">{fmtCurrency(pago.monto, pago.moneda)}</td>
                <td className="text-[11px] text-mist">{fmtDate(pago.fecha_pago)}</td>
                <td className="text-[11px] font-medium">{daysUntil(pago.fecha_limite)}</td>
                <td className="text-[11px] text-mist">{pagoMetodoLabel(pago.metodo)}</td>
                <td><span className={`pill ${pagoEstadoPillClass(pago.estado)}`}>{pagoEstadoLabel(pago.estado)}</span></td>
                <td>
                  {pago.estado !== 'confirmado' && (
                    <button className="btn btn-primary text-xs" disabled={confirmandoPago} onClick={() => confirmarPago(pago.pago_id)}>
                      Confirmar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setForm(initialForm); }}
        title="Registrar pago"
        footer={<>
          <button className="btn btn-outline" onClick={() => { setModalOpen(false); setForm(initialForm); }}>Cancelar</button>
          <button className="btn btn-primary" form="pago-form" type="submit" disabled={creandoPago}>
            {creandoPago ? 'Guardando...' : 'Registrar pago'}
          </button>
        </>}
      >
        <form id="pago-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>

          {/* Toggle modo */}
          <div className="md:col-span-2">
            <div className="mb-2 text-xs text-mist">Buscar por</div>
            <div className="flex gap-2">
              {['pedido', 'proveedor'].map(modo => (
                <button key={modo} type="button"
                  onClick={() => setForm(f => ({ ...f, pedido_id: '', proveedor_id: '', _modo: modo }))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-card border transition-colors
                    ${(form._modo || 'pedido') === modo ? 'bg-tl text-white border-tl' : 'bg-sur border-border text-mist hover:border-tl/40'}`}>
                  {modo === 'pedido' ? '📋 Pedido' : '🏭 Proveedor'}
                </button>
              ))}
            </div>
          </div>

          {/* Modo pedido → proveedor auto */}
          {(form._modo || 'pedido') === 'pedido' && (<>
            <div>
              <div className="mb-1 text-xs text-mist">Pedido</div>
              <select className="form-input" name="pedido_id" value={form.pedido_id} onChange={handleChange} required>
                <option value="">Seleccionar...</option>
                {pedidosConProveedor.map(p => (
                  <option key={p.pedido_id} value={p.pedido_id}>
                    {p.codigo} — {p.proveedor?.nombre || `Proveedor #${p.proveedor_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs text-mist">Proveedor <span className="text-[9px] text-tl">· del pedido</span></div>
              <div className="form-input bg-sur2 flex items-center gap-2 min-h-[38px]">
                {pedidoSeleccionado ? (
                  <>
                    <span>{pedidoSeleccionado.proveedor?.pais?.bandera || ''}</span>
                    <span className="font-medium text-ink">{pedidoSeleccionado.proveedor?.nombre || `Proveedor #${pedidoSeleccionado.proveedor_id}`}</span>
                    <span className="ml-auto text-[9px] text-mist">🔒</span>
                  </>
                ) : (
                  <span className="text-mist text-xs">Seleccioná un pedido primero</span>
                )}
              </div>
            </div>
          </>)}

          {/* Modo proveedor → pedidos filtrados */}
          {form._modo === 'proveedor' && (<>
            <div>
              <div className="mb-1 text-xs text-mist">Proveedor</div>
              <select className="form-input" name="proveedor_id" value={form.proveedor_id} onChange={handleChange} required>
                <option value="">Seleccionar...</option>
                {proveedores.map(p => (
                  <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs text-mist">Pedido</div>
              <select className="form-input" name="pedido_id" value={form.pedido_id} onChange={handleChange} required disabled={!form.proveedor_id}>
                <option value="">{form.proveedor_id ? 'Seleccionar pedido...' : 'Seleccioná un proveedor primero'}</option>
                {pedidosConProveedor
                  .filter(p => String(p.proveedor_id) === String(form.proveedor_id))
                  .map(p => (
                    <option key={p.pedido_id} value={p.pedido_id}>{p.codigo}</option>
                  ))}
              </select>
            </div>
          </>)}

          <div>
            <div className="mb-1 text-xs text-mist">Tipo</div>
            <select className="form-input" name="tipo" value={form.tipo} onChange={handleChange}>
              <option value="senal">{pagoTipoLabel('senal')}</option>
              <option value="saldo">{pagoTipoLabel('saldo')}</option>
              <option value="total">{pagoTipoLabel('total')}</option>
              <option value="anticipo">{pagoTipoLabel('anticipo')}</option>
              <option value="devolucion">{pagoTipoLabel('devolucion')}</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Monto</div>
            <input className="form-input" name="monto" type="number" min="0" step="0.01" value={form.monto} onChange={handleChange} required />
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Moneda</div>
            <select className="form-input" name="moneda" value={form.moneda} onChange={handleChange}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CRC">CRC</option>
              <option value="CNY">CNY</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Método</div>
            <select className="form-input" name="metodo" value={form.metodo} onChange={handleChange}>
              <option value="swift">{pagoMetodoLabel('swift')}</option>
              <option value="transferencia_local">{pagoMetodoLabel('transferencia_local')}</option>
              <option value="cheque">{pagoMetodoLabel('cheque')}</option>
              <option value="efectivo">{pagoMetodoLabel('efectivo')}</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Fecha de pago</div>
            <input className="form-input" name="fecha_pago" type="date" value={form.fecha_pago} onChange={handleChange} required />
          </div>

          <div>
            <div className="mb-1 text-xs text-mist">Fecha límite</div>
            <input className="form-input" name="fecha_limite" type="date" value={form.fecha_limite} onChange={handleChange} />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-mist">Referencia</div>
            <input className="form-input" name="referencia" value={form.referencia} onChange={handleChange} placeholder="Número de transferencia" />
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-mist">URL comprobante</div>
            <input className="form-input" name="comprobante_url" type="url" value={form.comprobante_url} onChange={handleChange} placeholder="https://drive.google.com/..." />
          </div>

          {pedidoSeleccionado && (
            <div className="md:col-span-2 rounded-lg bg-sur2 px-3 py-2 text-xs text-mist">
              Pedido: <span className="font-medium text-ink">{pedidoSeleccionado.codigo}</span>
              {' · '}
              <span>{pedidoSeleccionado.proveedor?.nombre}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
