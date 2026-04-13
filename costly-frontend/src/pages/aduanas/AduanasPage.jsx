import { useState, useEffect } from 'react';
import { useImportaciones, useTramiteAduana, useUpsertTramiteAduana } from '../../hooks/useApi';
import {
  fmtCurrency,
  fmtDate,
  importacionEstadoLabel,
  importacionSemaforoClass,
  tramiteEstadoLabel,
  tramiteEstadoPillClass,
  tramiteEstadoOptions,
} from '../../lib/utils';
import Spinner from '../../components/ui/Spinner';

const NORMATIVA = [
  {
    tipo: 'General (maquinaria, equipos)',
    documentos: 'Factura comercial, BL, DUA, lista de empaque, póliza de seguro',
    entidad: 'TICA / Hacienda CR',
    url: 'https://tica.hacienda.go.cr/',
  },
  {
    tipo: 'Alimentos y bebidas',
    documentos: 'Factura comercial, BL, DUA, registro sanitario MINSA, certificado de origen, certificado sanitario del país de origen',
    entidad: 'MINSA CR / SENASA',
    url: 'https://www.senasa.go.cr/',
  },
  {
    tipo: 'Químicos y sustancias controladas',
    documentos: 'Factura comercial, BL, DUA, ficha técnica SDS/MSDS, permiso Ministerio de Salud o SETENA',
    entidad: 'Ministerio de Salud CR',
    url: 'https://www.ministeriodesalud.go.cr/',
  },
  {
    tipo: 'Carga peligrosa (IMDG / ADR)',
    documentos: 'Factura comercial, BL, DUA, declaración de mercancías peligrosas, etiquetado IMDG, certificados de embalaje',
    entidad: 'MOPT / IMO',
    url: 'https://www.mopt.go.cr/',
  },
  {
    tipo: 'Productos con refrigerantes',
    documentos: 'Factura comercial, BL, DUA, permiso especial del MINAE (sustancias que agotan la capa de ozono)',
    entidad: 'MINAE CR',
    url: 'https://minae.go.cr/',
  },
  {
    tipo: 'Electrónica y telecomunicaciones',
    documentos: 'Factura comercial, BL, DUA, certificación SUTEL si el equipo requiere homologación en CR',
    entidad: 'SUTEL CR',
    url: 'https://sutel.go.cr/',
  },
  {
    tipo: 'Vehículos y maquinaria autopropulsada',
    documentos: 'Factura comercial, BL, DUA, certificado de origen, VIN, inspección COSEVI',
    entidad: 'COSEVI CR',
    url: 'https://www.cosevi.go.cr/',
  },
  {
    tipo: 'Medicamentos y dispositivos médicos',
    documentos: 'Factura comercial, BL, DUA, registro en CCSS o Ministerio de Salud, certificado de origen',
    entidad: 'MINSA CR',
    url: 'https://www.ministeriodesalud.go.cr/',
  },
];

const ENLACES = [
  { label: 'Sistema TICA — Ministerio de Hacienda CR', url: 'https://tica.hacienda.go.cr/' },
  { label: 'Arancel Centroamericano (SAC) — COMEX', url: 'https://www.comex.go.cr/' },
  { label: 'SENASA', url: 'https://www.senasa.go.cr/' },
  { label: 'Ministerio de Salud CR', url: 'https://www.ministeriodesalud.go.cr/' },
  { label: 'SETENA', url: 'https://www.setena.go.cr/' },
  { label: 'MINAE', url: 'https://minae.go.cr/' },
  { label: 'SUTEL', url: 'https://sutel.go.cr/' },
  { label: 'INCOTERMS 2020 — ICC', url: 'https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/' },
];

const EMPTY_FORM = {
  dua_numero: '',
  fecha_dua: '',
  tc_hacienda: '',
  almacen_fiscal: '',
  valor_cif_cr: '',
  total_tributos: '',
  estado: 'pendiente',
};

function toDateInput(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function AduanasPage() {
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: importaciones = [], isLoading } = useImportaciones();
  const enAduana = importaciones.filter((i) => ['en_aduana', 'en_puerto_cr'].includes(i.estado));

  const { data: tramite, isLoading: loadingTramite } = useTramiteAduana(selId);
  const upsert = useUpsertTramiteAduana();

  // Pre-fill form when tramite loads
  useEffect(() => {
    if (tramite) {
      setForm({
        dua_numero: tramite.dua_numero ?? '',
        fecha_dua: toDateInput(tramite.fecha_dua),
        tc_hacienda: tramite.tc_hacienda ?? '',
        almacen_fiscal: tramite.almacen_fiscal ?? '',
        valor_cif_cr: tramite.valor_cif_cr ?? '',
        total_tributos: tramite.total_tributos ?? '',
        estado: tramite.estado ?? 'pendiente',
      });
    } else if (selId) {
      setForm(EMPTY_FORM);
    }
  }, [tramite, selId]);

  const selImp = importaciones.find((i) => i.importacion_id === selId);

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleGuardar = () => {
    if (!selId) return;
    upsert.mutate({
      importacion_id: selId,
      dua_numero: form.dua_numero || undefined,
      fecha_dua: form.fecha_dua ? new Date(form.fecha_dua).toISOString() : undefined,
      tc_hacienda: form.tc_hacienda ? Number(form.tc_hacienda) : undefined,
      almacen_fiscal: form.almacen_fiscal || undefined,
      valor_cif_cr: form.valor_cif_cr ? Number(form.valor_cif_cr) : undefined,
      total_tributos: form.total_tributos ? Number(form.total_tributos) : undefined,
      estado: form.estado || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
        <div className="flex gap-4 items-start">
          {/* ── Left: DUA form ── */}
          <div className="flex-1 min-w-0">
            {!selId ? (
              <div className="card">
                <p className="p-10 text-center text-xs text-mist">
                  Seleccioná una importación de la lista para ver o editar su trámite.
                </p>
              </div>
            ) : loadingTramite ? (
              <div className="card flex justify-center p-10">
                <Spinner />
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">🏛️ {selImp?.codigo} — Trámite DUA</div>
                  <span className={`pill ${tramiteEstadoPillClass(form.estado)}`}>
                    {tramiteEstadoLabel(form.estado)}
                  </span>
                </div>
                <div className="card-body space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">DUA número</label>
                      <input
                        className="form-input"
                        value={form.dua_numero}
                        onChange={field('dua_numero')}
                        placeholder="Ej: DUA-2026-04-001"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha DUA</label>
                      <input
                        className="form-input"
                        type="date"
                        value={form.fecha_dua}
                        onChange={field('fecha_dua')}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">TC Hacienda (₡)</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        value={form.tc_hacienda}
                        onChange={field('tc_hacienda')}
                        placeholder="Ej: 518.40"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Almacén fiscal</label>
                      <input
                        className="form-input"
                        value={form.almacen_fiscal}
                        onChange={field('almacen_fiscal')}
                        placeholder="Ej: Almacén Heredia S.A."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Valor CIF CR (USD)</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        value={form.valor_cif_cr}
                        onChange={field('valor_cif_cr')}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total tributos (USD)</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        value={form.total_tributos}
                        onChange={field('total_tributos')}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group col-span-2">
                      <label className="form-label">Estado del trámite</label>
                      <select className="form-input" value={form.estado} onChange={field('estado')}>
                        {tramiteEstadoOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumen calculado */}
                  {(form.valor_cif_cr || form.total_tributos) && (
                    <div className="rounded-card border border-border bg-sur2 px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-mist mb-0.5">Valor CIF CR</div>
                        <div className="font-semibold text-ink">
                          {fmtCurrency(Number(form.valor_cif_cr) || 0, 'USD')}
                        </div>
                      </div>
                      <div>
                        <div className="text-mist mb-0.5">Total tributos</div>
                        <div className="font-semibold text-rs">
                          {fmtCurrency(Number(form.total_tributos) || 0, 'USD')}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-full justify-center"
                    onClick={handleGuardar}
                    disabled={upsert.isPending}
                  >
                    {upsert.isPending ? 'Guardando...' : '💾 Guardar trámite'}
                  </button>

                  {upsert.isSuccess && (
                    <div className="rounded-card border border-sg/30 bg-sg-l px-3 py-2 text-xs text-sg font-medium">
                      ✓ Trámite guardado correctamente
                    </div>
                  )}
                  {upsert.isError && (
                    <div className="rounded-card border border-rs/30 bg-rs-l px-3 py-2 text-xs text-rs font-medium">
                      Error al guardar — {upsert.error?.message ?? 'Intentá de nuevo'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: importaciones en aduana ── */}
          <div className="w-72 flex-shrink-0">
            <div className="card">
              <div className="card-header">
                <div className="card-title">📋 En aduana / puerto</div>
                <span className="text-[11px] text-mist">{enAduana.length} importaciones</span>
              </div>
              {enAduana.length === 0 ? (
                <p className="p-6 text-center text-xs text-mist">No hay importaciones en aduana</p>
              ) : (
                <div className="divide-y divide-border-lt">
                  {enAduana.map((imp) => {
                    const isSelected = imp.importacion_id === selId;
                    return (
                      <div
                        key={imp.importacion_id}
                        onClick={() => setSelId(imp.importacion_id)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                          ${isSelected ? 'bg-tl-xl' : 'hover:bg-sur2'}`}
                      >
                        <span className={`s3 ${importacionSemaforoClass(imp.estado)}`} />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-medium truncate ${isSelected ? 'text-tl' : 'text-ink'}`}
                          >
                            {imp.codigo}
                          </div>
                          <div className="text-[10px] text-mist">
                            {importacionEstadoLabel(imp.estado)} · {fmtDate(imp.creado_en)}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-tl flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* ── Normativa de importaciones ── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📄 Normativa de importaciones</div>
              <span className="text-[11px] text-mist">Referencia general — puede variar según partida arancelaria</span>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Tipo de carga</th>
                    <th>Documentos / permisos principales requeridos en CR</th>
                    <th>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {NORMATIVA.map((row) => (
                    <tr key={row.tipo}>
                      <td className="font-medium whitespace-nowrap">{row.tipo}</td>
                      <td className="text-mist">{row.documentos}</td>
                      <td className="whitespace-nowrap">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-tl hover:underline text-xs"
                        >
                          {row.entidad}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-body border-t border-border-lt pt-3">
              <p className="text-[11px] text-mist mb-2 font-medium">Enlaces a fuentes oficiales</p>
              <div className="flex flex-wrap gap-2">
                {ENLACES.map((e) => (
                  <a
                    key={e.label}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill pill-gray hover:bg-tl hover:text-white transition-colors cursor-pointer"
                  >
                    {e.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
