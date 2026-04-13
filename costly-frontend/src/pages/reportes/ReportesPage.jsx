import { useState } from 'react';
import { useGenerar, useSaveReporte, useProveedores, useClientes } from '../../hooks/useApi';
import { TableCard, TableContainer } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { exportExcel, exportPdf } from '../../lib/export';
import {
  estadoLabel,
  estadoPillClass,
  pedidoEstadoOptions,
  importacionEstadoLabel,
  importacionEstadoPillClass,
  importacionEstadoOptions,
  costeoEstadoLabel,
  costeoEstadoPillClass,
  costeoEstadoOptions,
  hitoTipoLabel,
  hitoDotClass,
  hitoSubtitulo,
  pagoTipoLabel,
  permisoTipoLabel,
  fmtCurrency,
  fmtDate,
  getSemaforo,
  semaforoClass,
} from '../../lib/utils';

// ── Definición de reportes ────────────────────────────────────
const REPORT_DEFS = [
  {
    tipo: 'r01',
    icon: '📋',
    label: 'R01 — Pedidos activos',
    configFields: ['proveedor_id', 'estado_pedido'],
  },
  { tipo: 'r02', icon: '🚢', label: 'R02 — Importaciones', configFields: ['estado_importacion'] },
  { tipo: 'r03', icon: '💰', label: 'R03 — Costeos', configFields: ['estado_costeo'] },
  { tipo: 'r04', icon: '💳', label: 'R04 — Pagos pendientes', configFields: ['dias_limite'] },
  { tipo: 'r05', icon: '🎯', label: 'R05 — Hitos vencidos', configFields: ['dias_alerta'] },
  { tipo: 'r07', icon: '📦', label: 'R07 — Top productos', configFields: ['desde', 'top'] },
  { tipo: 'r09', icon: '📜', label: 'R09 — Permisos por vencer', configFields: ['dias_alerta'] },
  {
    tipo: 'r11',
    icon: '📈',
    label: 'R11 — Utilidad por importación',
    configFields: ['desde', 'hasta'],
  },
  {
    tipo: 'dinamico',
    icon: '⚙️',
    label: 'Reporte dinámico',
    configFields: ['estado_pedido', 'proveedor_id', 'cliente_id', 'desde', 'hasta'],
    full: true,
  },
];

// ── Campos de configuración ───────────────────────────────────
// Cada entrada define: key (backend), label, y cómo renderizarlo
function buildConfigFieldDefs(proveedores, clientes) {
  return {
    proveedor_id: {
      key: 'proveedor_id',
      label: 'Proveedor',
      type: 'select',
      options: proveedores.map((p) => ({ value: p.proveedor_id, label: p.nombre })),
      placeholder: 'Todos',
    },
    cliente_id: {
      key: 'cliente_id',
      label: 'Cliente',
      type: 'select',
      options: clientes.map((c) => ({ value: c.cliente_id, label: c.nombre })),
      placeholder: 'Todos',
    },
    estado_pedido: {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: pedidoEstadoOptions.map((v) => ({ value: v, label: estadoLabel(v) })),
      placeholder: 'Todos',
    },
    estado_importacion: {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: importacionEstadoOptions,
      placeholder: 'Todos',
    },
    estado_costeo: {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: costeoEstadoOptions,
      placeholder: 'Todos',
    },
    dias_limite: { key: 'dias_limite', label: 'Días límite', type: 'number', placeholder: '30' },
    dias_alerta: { key: 'dias_alerta', label: 'Días de alerta', type: 'number', placeholder: '7' },
    desde: { key: 'desde', label: 'Desde', type: 'date' },
    hasta: { key: 'hasta', label: 'Hasta', type: 'date' },
    top: { key: 'top', label: 'Top N', type: 'number', placeholder: '20' },
  };
}

function ConfigField({ def, value, onChange }) {
  const val = value ?? '';
  const base = 'form-input h-8 text-xs w-full';
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-mist">{def.label}</label>
      {def.type === 'date' && (
        <input type="date" className={base} value={val}
          onChange={(e) => onChange(def.key, e.target.value)} />
      )}
      {def.type === 'number' && (
        <input type="number" className={base} placeholder={def.placeholder} value={val}
          onChange={(e) => onChange(def.key, e.target.value)} />
      )}
      {def.type === 'select' && (
        <select className={base} value={val}
          onChange={(e) => onChange(def.key, e.target.value)}>
          <option value="">{def.placeholder ?? 'Todos'}</option>
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ── Columnas por tipo de reporte ──────────────────────────────
const COLUMNS = {
  r01: {
    headers: ['', 'Pedido', 'Proveedor', 'Estado', 'Próx. hito', 'Moneda'],
    exportHeaders: ['Pedido', 'Proveedor', 'Estado', 'Próx. hito', 'Moneda'],
    flat: (r) => {
      const hito = r.hitos?.[0]
      const sub  = hito ? hitoSubtitulo(hito) : null
      return [
        r.codigo,
        r.proveedor?.nombre ?? '—',
        estadoLabel(r.estado),
        hito ? `${hitoTipoLabel(hito.tipo)} — ${sub?.text ?? ''}` : '—',
        r.moneda,
      ]
    },
    row: (r) => {
      const hito = r.hitos?.[0];
      const sub = hito ? hitoSubtitulo(hito) : null;
      return (
        <tr key={r.pedido_id}>
          <td className="pl-3">
            <span className={`s3 ${semaforoClass(getSemaforo(hito?.fecha_plan))}`} />
          </td>
          <td><strong>{r.codigo}</strong></td>
          <td className="text-[11.5px]">{r.proveedor?.pais?.bandera} {r.proveedor?.nombre}</td>
          <td><span className={`pill ${estadoPillClass(r.estado)}`}>{estadoLabel(r.estado)}</span></td>
          <td className="text-[11.5px]" style={{ color: sub?.color ?? 'var(--mist)' }}>
            {hito ? `${hitoTipoLabel(hito.tipo)} — ${sub?.text}` : '—'}
          </td>
          <td className="text-[11px] text-mist">{r.moneda}</td>
        </tr>
      );
    },
  },

  r02: {
    headers: ['Código', 'Estado', 'Pedidos', 'Costeos'],
    flat: (r) => [r.codigo, importacionEstadoLabel(r.estado), r._count?.pedidos ?? 0, r._count?.costeos ?? 0],
    row: (r) => (
      <tr key={r.importacion_id}>
        <td><strong>{r.codigo}</strong></td>
        <td><span className={`pill ${importacionEstadoPillClass(r.estado)}`}>{importacionEstadoLabel(r.estado)}</span></td>
        <td className="text-[11px] text-mist">{r._count?.pedidos ?? 0}</td>
        <td className="text-[11px] text-mist">{r._count?.costeos ?? 0}</td>
      </tr>
    ),
  },

  r03: {
    headers: ['Importación', 'Creador', 'Estado', 'Costo total CR', 'Precio venta', 'Utilidad'],
    flat: (r) => [
      r.importacion?.codigo ?? '—',
      r.creador?.nombre ?? '—',
      costeoEstadoLabel(r.estado),
      fmtCurrency(r.costo_total_cr, 'CRC'),
      r.precio_venta_total ? fmtCurrency(r.precio_venta_total, 'CRC') : '—',
      r.utilidad_bruta ? fmtCurrency(r.utilidad_bruta, 'CRC') : '—',
    ],
    row: (r) => (
      <tr key={r.costeo_id}>
        <td className="text-[11px]">{r.importacion?.codigo ?? '—'}</td>
        <td className="text-[11px] text-mist">{r.creador?.nombre ?? '—'}</td>
        <td><span className={`pill ${costeoEstadoPillClass(r.estado)}`}>{costeoEstadoLabel(r.estado)}</span></td>
        <td className="text-[11px]">{fmtCurrency(r.costo_total_cr, 'CRC')}</td>
        <td className="text-[11px]">{r.precio_venta_total ? fmtCurrency(r.precio_venta_total, 'CRC') : '—'}</td>
        <td className="text-[11px]">{r.utilidad_bruta ? fmtCurrency(r.utilidad_bruta, 'CRC') : '—'}</td>
      </tr>
    ),
  },

  r04: {
    headers: ['Pedido', 'Proveedor', 'Tipo', 'Monto', 'Fecha límite'],
    flat: (r) => [r.pedido?.codigo ?? '—', r.proveedor?.nombre ?? '—', pagoTipoLabel(r.tipo), fmtCurrency(r.monto, r.moneda), fmtDate(r.fecha_limite)],
    row: (r) => (
      <tr key={r.pago_id}>
        <td className="text-[11px]">{r.pedido?.codigo ?? '—'}</td>
        <td className="text-[11px] text-mist">{r.proveedor?.nombre ?? '—'}</td>
        <td className="text-[11px]">{pagoTipoLabel(r.tipo)}</td>
        <td className="text-[11px]">{fmtCurrency(r.monto, r.moneda)}</td>
        <td className="text-[11px] text-mist">{fmtDate(r.fecha_limite)}</td>
      </tr>
    ),
  },

  r05: {
    headers: ['Estado', 'Pedido', 'Hito', 'Fecha plan', 'Responsable'],
    flat: (r) => [r.estado, r.pedido?.codigo ?? '—', hitoTipoLabel(r.tipo), fmtDate(r.fecha_plan), r.responsable?.nombre ?? '—'],
    row: (r) => (
      <tr key={r.hito_id}>
        <td className="pl-3"><span className={hitoDotClass(r.estado)} /></td>
        <td className="text-[11px]">{r.pedido?.codigo ?? '—'}</td>
        <td className="text-[11px]">{hitoTipoLabel(r.tipo)}</td>
        <td className="text-[11px] text-mist">{fmtDate(r.fecha_plan)}</td>
        <td className="text-[11px] text-mist">{r.responsable?.nombre ?? '—'}</td>
      </tr>
    ),
  },

  r07: {
    headers: ['Producto', 'SKU', 'Categoría', '# Pedidos', 'Cantidad total', 'Monto total'],
    flat: (r) => [r.producto?.nombre ?? '—', r.producto?.sku ?? '—', r.producto?.categoria ?? '—', r.pedidos, Number(r.cantidad_total ?? 0).toFixed(0), fmtCurrency(r.monto_total)],
    row: (r, i) => (
      <tr key={i}>
        <td className="text-[11.5px]">{r.producto?.nombre ?? '—'}</td>
        <td className="text-[11px] text-mist">{r.producto?.sku ?? '—'}</td>
        <td className="text-[11px] text-mist">{r.producto?.categoria ?? '—'}</td>
        <td className="text-[11px]">{r.pedidos}</td>
        <td className="text-[11px]">{Number(r.cantidad_total ?? 0).toFixed(0)}</td>
        <td className="text-[11px]">{fmtCurrency(r.monto_total)}</td>
      </tr>
    ),
  },

  r09: {
    headers: ['Pedido', 'Producto', 'Tipo permiso', 'Vencimiento'],
    flat: (r) => [r.pedido?.codigo ?? '—', r.producto ? `${r.producto.nombre} (${r.producto.sku})` : '—', permisoTipoLabel(r.tipo), fmtDate(r.fecha_vencimiento)],
    row: (r) => (
      <tr key={r.permiso_id}>
        <td className="text-[11px]">{r.pedido?.codigo ?? '—'}</td>
        <td className="text-[11px] text-mist">{r.producto ? `${r.producto.nombre} (${r.producto.sku})` : '—'}</td>
        <td className="text-[11px]">{permisoTipoLabel(r.tipo)}</td>
        <td className="text-[11px] text-mist">{fmtDate(r.fecha_vencimiento)}</td>
      </tr>
    ),
  },

  r11: {
    headers: ['Importación', 'Costo total CR', 'Precio venta', 'Utilidad bruta', 'Margen'],
    flat: (r) => [r.importacion, fmtCurrency(r.costo_total_cr, 'CRC'), r.precio_venta_total ? fmtCurrency(r.precio_venta_total, 'CRC') : '—', r.utilidad_bruta ? fmtCurrency(r.utilidad_bruta, 'CRC') : '—', r.margen_global != null ? `${Number(r.margen_global).toFixed(1)} %` : '—'],
    row: (r, i) => (
      <tr key={i}>
        <td className="text-[11px]">{r.importacion}</td>
        <td className="text-[11px]">{fmtCurrency(r.costo_total_cr, 'CRC')}</td>
        <td className="text-[11px]">{r.precio_venta_total ? fmtCurrency(r.precio_venta_total, 'CRC') : '—'}</td>
        <td className="text-[11px]">{r.utilidad_bruta ? fmtCurrency(r.utilidad_bruta, 'CRC') : '—'}</td>
        <td className="text-[11px] text-mist">{r.margen_global != null ? `${Number(r.margen_global).toFixed(1)} %` : '—'}</td>
      </tr>
    ),
  },
};

COLUMNS.dinamico = COLUMNS.r01;

// ── Componente principal ──────────────────────────────────────
export default function ReportesPage() {
  const [selected, setSelected] = useState(REPORT_DEFS[0]);
  const [config, setConfig] = useState({});
  const [showSave, setShowSave] = useState(false);
  const [saveNombre, setSaveNombre] = useState('');

  const generar = useGenerar();
  const saveReporte = useSaveReporte();
  const { data: proveedores = [] } = useProveedores();
  const { data: clientes = [] } = useClientes();

  const fieldDefs = buildConfigFieldDefs(proveedores, clientes);

  const resultado = generar.data?.data; // { tipo, total, data: [] }
  const filas = resultado?.data ?? [];
  const cols = COLUMNS[resultado?.tipo];

  const setConfigKey = (key, val) =>
    setConfig((c) => ({ ...c, [key]: val === '' ? undefined : val }));

  const handleSelect = (def) => {
    setSelected(def);
    setConfig({});
    generar.reset();
  };

  const handleGenerar = () => {
    if (!selected) return;
    generar.mutate({ tipo: selected.tipo, config });
  };

  const handleSave = () => {
    if (!selected || !saveNombre.trim()) return;
    saveReporte.mutate(
      { nombre: saveNombre.trim(), tipo: selected.tipo, config_json: config },
      {
        onSuccess: () => {
          setShowSave(false);
          setSaveNombre('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">

      {/* ── Dos columnas: selector + config ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Reportes predefinidos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Reportes predefinidos</div>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {REPORT_DEFS.map((def) => (
              <button
                key={def.tipo}
                className={`btn btn-sm text-left justify-start text-[11.5px] ${def.full ? 'col-span-2' : ''} ${selected?.tipo === def.tipo ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleSelect(def)}
              >
                {def.icon} {def.label}
              </button>
            ))}
          </div>
        </div>

        {/* Configurar reporte */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚙️ Configurar reporte</div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-ink">
              {selected.icon} {selected.label}
            </div>

            {selected && selected.configFields.length > 0 && (
              <div className={selected.configFields.length >= 2 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                {selected.configFields.map((fieldKey) => {
                  const def = fieldDefs[fieldKey];
                  if (!def) return null;
                  return <ConfigField key={fieldKey} def={def} value={config[def.key]} onChange={setConfigKey} />;
                })}
              </div>
            )}

            <div className="flex gap-2 mt-auto pt-2">
              <button
                className="btn btn-primary flex-1"
                disabled={generar.isPending}
                onClick={handleGenerar}
              >
                {generar.isPending ? 'Generando...' : '🚀 Generar'}
              </button>
              <button
                className="btn btn-outline btn-sm"
                title="Guardar configuración"
                onClick={() => { setShowSave(true); setSaveNombre(selected?.label ?? ''); }}
              >
                💾
              </button>
            </div>

            {generar.isError && (
              <div className="rounded-card border border-rs/30 bg-rs-l px-3 py-2 text-xs text-rs font-medium">
                {generar.error?.error?.message ?? 'Error al generar el reporte'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Resultado ── */}
      {resultado && (
        <TableCard
          title={`${selected?.icon ?? ''} ${selected?.label ?? 'Resultado'}`}
          countLabel={`${resultado.total ?? filas.length} registros`}
          isEmpty={filas.length === 0}
          emptyMessage="El reporte no arrojó resultados con los filtros seleccionados"
          actions={cols && filas.length > 0 && (
            <div className="flex gap-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => exportExcel(cols.exportHeaders ?? cols.headers, filas.map(cols.flat), selected?.tipo ?? 'reporte')}
              >
                📊 Excel
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => exportPdf(cols.exportHeaders ?? cols.headers, filas.map(cols.flat), selected?.label ?? 'Reporte', selected?.tipo ?? 'reporte')}
              >
                📄 PDF
              </button>
            </div>
          )}
        >
          {cols ? (
            <TableContainer>
              <thead>
                <tr>{cols.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>{filas.map((fila, i) => cols.row(fila, i))}</tbody>
            </TableContainer>
          ) : (
            <div className="p-4 text-xs text-mist font-mono overflow-x-auto">
              <pre>{JSON.stringify(filas.slice(0, 5), null, 2)}</pre>
            </div>
          )}
        </TableCard>
      )}

      {/* ── Modal: Guardar configuración ── */}
      <Modal
        open={showSave}
        onClose={() => setShowSave(false)}
        title="Guardar configuración"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowSave(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              disabled={!saveNombre.trim() || saveReporte.isPending}
              onClick={handleSave}
            >
              {saveReporte.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nombre del reporte guardado *</label>
          <input
            className="form-input"
            placeholder="Ej: Pedidos activos mensual"
            value={saveNombre}
            onChange={(e) => setSaveNombre(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
