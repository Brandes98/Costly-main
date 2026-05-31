import { useState } from 'react';
import { useImportaciones } from '../../hooks/useApi';
import {
  fmtCurrency,
  fmtDate,
  importacionEstadoLabel,
  importacionSemaforoClass,
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

export default function AduanasPage() {
  const [selId, setSelId] = useState(null);

  const { data: importaciones = [], isLoading } = useImportaciones();

  const enAduana = importaciones.filter(i => ['en_aduana', 'en_puerto_cr'].includes(i.estado));
  const selImp = importaciones.find(i => i.importacion_id === selId);

  // Extraer todos los productos con permiso requerido de la importación seleccionada
  const productosConPermiso = selImp
    ? (selImp.pedidos || []).flatMap(pedido =>
        (pedido.lineas || [])
          .filter(l => l.producto?.requiere_permiso)
          .map(l => ({
            pedido_codigo:     pedido.codigo,
            pedido_id:         pedido.pedido_id,
            importacion_codigo: selImp.codigo,
            importacion_id:    selImp.importacion_id,
            producto_nombre:   l.producto?.nombre,
            producto_sku:      l.producto?.sku,
            permiso_tipo:      l.producto?.permiso_tipo || 'Sin especificar',
            cantidad:          Number(l.cantidad),
            total_linea:       Number(l.total_linea || 0),
            moneda:            pedido.moneda,
            linea_id:          l.linea_id,
          }))
      )
    : [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-4">

          {/* ── Layout principal ── */}
          <div className="flex gap-4 items-start">

            {/* ── Panel izquierdo: productos con permiso ── */}
            <div className="flex-1 min-w-0">
              {!selId ? (
                <div className="card">
                  <div className="p-10 text-center space-y-2">
                    <div className="text-3xl">🏛️</div>
                    <div className="text-sm font-medium text-ink">Seleccioná una importación</div>
                    <div className="text-xs text-mist">
                      Se mostrarán los productos que requieren permiso especial para su ingreso a Costa Rica.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      ⚠️ Productos con permiso especial — {selImp?.codigo}
                    </div>
                    <span className="text-[11px] text-mist">
                      {productosConPermiso.length} producto{productosConPermiso.length !== 1 ? 's' : ''} requiere{productosConPermiso.length === 1 ? '' : 'n'} permiso
                    </span>
                  </div>

                  {productosConPermiso.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <div className="text-3xl">✅</div>
                      <div className="text-sm font-medium text-sg">Sin permisos especiales</div>
                      <div className="text-xs text-mist">
                        Ningún producto en esta importación requiere permiso especial.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Alerta resumen */}
                      <div className="mx-4 mt-3 rounded-card border border-am/30 bg-yellow-50 px-4 py-3 flex items-start gap-3">
                        <span className="text-lg mt-0.5">⚠️</span>
                        <div className="text-xs text-am leading-relaxed">
                          <span className="font-semibold">Atención:</span> Los siguientes productos requieren documentación especial antes del retiro en aduana.
                          Verificá con tu agente aduanero que todos los permisos estén gestionados.
                        </div>
                      </div>

                      <div className="overflow-x-auto mt-3">
                        <table className="tbl">
                          <thead>
                            <tr>
                              <th>Importación</th>
                              <th>Pedido</th>
                              <th>Producto</th>
                              <th>SKU</th>
                              <th>Tipo de permiso requerido</th>
                              <th className="text-right">Cantidad</th>
                              <th className="text-right">Total línea</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosConPermiso.map((item, i) => (
                              <tr key={item.linea_id || i}>
                                <td>
                                  <span className="pill pill-blue text-[9px]">
                                    {item.importacion_codigo}
                                  </span>
                                </td>
                                <td>
                                  <span className="pill pill-gray text-[9px]">
                                    {item.pedido_codigo}
                                  </span>
                                </td>
                                <td>
                                  <div className="font-medium text-xs">{item.producto_nombre}</div>
                                </td>
                                <td>
                                  <code className="text-[10px] bg-sur2 px-1.5 py-0.5 rounded">
                                    {item.producto_sku}
                                  </code>
                                </td>
                                <td>
                                  <span className="pill pill-yellow text-[9px]">
                                    {item.permiso_tipo}
                                  </span>
                                </td>
                                <td className="text-right text-xs font-semibold">
                                  {item.cantidad.toLocaleString('en')}
                                </td>
                                <td className="text-right text-xs font-semibold text-tl">
                                  {fmtCurrency(item.total_linea, item.moneda)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-sur2">
                              <td colSpan={4} className="px-3 py-2 text-xs text-mist font-semibold">
                                Total productos con permiso
                              </td>
                              <td className="px-3 py-2 text-xs font-bold text-am">
                                {productosConPermiso.length} producto{productosConPermiso.length !== 1 ? 's' : ''}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Panel derecho: lista de importaciones ── */}
            <div className="w-72 flex-shrink-0">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">📋 Importaciones</div>
                  <span className="text-[11px] text-mist">{importaciones.length} total</span>
                </div>
                {importaciones.length === 0 ? (
                  <p className="p-6 text-center text-xs text-mist">No hay importaciones</p>
                ) : (
                  <div className="divide-y divide-border-lt">
                    {importaciones.map(imp => {
                      const isSelected = imp.importacion_id === selId

                      // Contar productos con permiso en esta importación
                      const conPermiso = (imp.pedidos || [])
                        .flatMap(p => p.lineas || [])
                        .filter(l => l.producto?.requiere_permiso).length

                      return (
                        <div
                          key={imp.importacion_id}
                          onClick={() => setSelId(imp.importacion_id)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                            ${isSelected ? 'bg-tl-xl' : 'hover:bg-sur2'}`}
                        >
                          <span className={`s3 ${importacionSemaforoClass(imp.estado)}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${isSelected ? 'text-tl' : 'text-ink'}`}>
                              {imp.codigo}
                            </div>
                            <div className="text-[10px] text-mist">
                              {importacionEstadoLabel(imp.estado)} · {fmtDate(imp.creado_en)}
                            </div>
                            {conPermiso > 0 && (
                              <div className="text-[9px] text-am font-semibold mt-0.5">
                                ⚠️ {conPermiso} producto{conPermiso !== 1 ? 's' : ''} con permiso
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-tl flex-shrink-0" />
                          )}
                        </div>
                      )
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
                  {NORMATIVA.map(row => (
                    <tr key={row.tipo}>
                      <td className="font-medium whitespace-nowrap">{row.tipo}</td>
                      <td className="text-mist">{row.documentos}</td>
                      <td className="whitespace-nowrap">
                        <a href={row.url} target="_blank" rel="noopener noreferrer"
                          className="text-tl hover:underline text-xs">
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
                {ENLACES.map(e => (
                  <a key={e.label} href={e.url} target="_blank" rel="noopener noreferrer"
                    className="pill pill-gray hover:bg-tl hover:text-white transition-colors cursor-pointer">
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
