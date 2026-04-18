import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import Spinner from '../../components/ui/Spinner';
import { TableCard, TableContainer } from '../../components/ui/Table';
import { useImportacion, useTramiteAduana } from '../../hooks/useApi';
import {
  estadoLabel,
  estadoPillClass,
  fmtCurrency,
  fmtDate,
  importacionEstadoLabel,
  importacionEstadoPillClass,
  tramiteEstadoLabel,
  tramiteEstadoPillClass,
} from '../../lib/utils';

function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map((pedido) => pedido.proveedor?.nombre).filter(Boolean))];
}

export default function ImportacionDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: importacion, isLoading } = useImportacion(id);
  const { data: tramite } = useTramiteAduana(id);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!importacion) {
    return <div className="p-12 text-center text-mist">Importación no encontrada</div>;
  }

  const pedidos = importacion.pedidos || [];
  const proveedores = resumenProveedores(pedidos);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button className="btn btn-outline px-2 text-xs" onClick={() => navigate(-1)}>
            <FaArrowLeft aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">{importacion.codigo}</h1>
            <div className="mt-0.5 text-xs text-mist">
              {pedidos.length} pedidos · {fmtDate(importacion.fecha_union || importacion.creado_en)}
            </div>
          </div>
        </div>
        <span className={`pill ${importacionEstadoPillClass(importacion.estado)}`}>
          {importacionEstadoLabel(importacion.estado)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="kpi">
          <div className="text-2xl font-bold text-ink">{pedidos.length}</div>
          <div className="text-[11px] text-mist">Pedidos agrupados</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-ink">{proveedores.length}</div>
          <div className="text-[11px] text-mist">Proveedores</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-ink">{importacion._count?.costeos ?? 0}</div>
          <div className="text-[11px] text-mist">Costeos registrados</div>
        </div>
        <div className="kpi">
          <div className="text-2xl font-bold text-ink">{importacion.contenedor || '-'}</div>
          <div className="text-[11px] text-mist">Contenedor</div>
        </div>
      </div>

      {tramite && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏛️ Trámite DUA</div>
            <span className={`pill ${tramiteEstadoPillClass(tramite.estado)}`}>
              {tramiteEstadoLabel(tramite.estado)}
            </span>
          </div>
          <div className="card-body grid grid-cols-2 gap-3 md:grid-cols-3 text-xs">
            <div>
              <div className="text-mist mb-0.5">DUA número</div>
              <div className="font-medium text-ink">{tramite.dua_numero || '—'}</div>
            </div>
            <div>
              <div className="text-mist mb-0.5">Fecha DUA</div>
              <div className="font-medium text-ink">{fmtDate(tramite.fecha_dua)}</div>
            </div>
            <div>
              <div className="text-mist mb-0.5">TC Hacienda</div>
              <div className="font-medium text-ink">
                {tramite.tc_hacienda ? `₡${Number(tramite.tc_hacienda).toFixed(2)}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-mist mb-0.5">Almacén fiscal</div>
              <div className="font-medium text-ink">{tramite.almacen_fiscal || '—'}</div>
            </div>
            <div>
              <div className="text-mist mb-0.5">Valor CIF CR</div>
              <div className="font-medium text-ink">
                {tramite.valor_cif_cr ? fmtCurrency(Number(tramite.valor_cif_cr), 'USD') : '—'}
              </div>
            </div>
            <div>
              <div className="text-mist mb-0.5">Total tributos</div>
              <div className="font-semibold text-rs">
                {tramite.total_tributos ? fmtCurrency(Number(tramite.total_tributos), 'USD') : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <TableCard
        title="Pedidos de la importación"
        countLabel={`${pedidos.length} pedidos`}
        isEmpty={pedidos.length === 0}
        emptyMessage="No hay pedidos asociados"
      >
        <TableContainer>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Incoterm</th>
              <th>Moneda</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.pedido_id}>
                <td>
                  <strong>{pedido.codigo}</strong>
                </td>
                <td>{pedido.proveedor?.nombre || `Proveedor #${pedido.proveedor_id}`}</td>
                <td>
                  <span className={`pill ${estadoPillClass(pedido.estado)}`}>
                    {estadoLabel(pedido.estado)}
                  </span>
                </td>
                <td>{pedido.incoterm || '-'}</td>
                <td>{pedido.moneda || '-'}</td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>
    </div>
  );
}
