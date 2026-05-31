import api from '../../lib/api';
import { useState } from 'react';
import { useGenerar, useSaveReporte, useDeleteReporte, useReportes, useProveedores, useClientes } from '../../hooks/useApi';
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
  pagoMetodoLabel,
  pagoEstadoLabel,
  permisoTipoLabel,
  fmtCurrency,
  fmtDate,
  getSemaforo,
  semaforoClass,
} from '../../lib/utils';

// ── Definición de reportes ────────────────────────────────────
const MODULOS = [
  {
    key: 'operaciones', label: '⚙️ Operaciones',
    reportes: [
      { tipo: 'pedidos',       icon: '📋', label: 'Pedidos',       configFields: ['fecha_inicio','fecha_fin','estado_pedido','proveedor_id','cliente_id'] },
      { tipo: 'importaciones', icon: '🚢', label: 'Importaciones', configFields: ['fecha_inicio','fecha_fin','estado_importacion'] },
      { tipo: 'costeos',       icon: '💰', label: 'Costeo',        configFields: ['fecha_inicio','fecha_fin','estado_costeo'] },
      { tipo: 'seguimiento',   icon: '⏱️', label: 'Seguimiento',   configFields: ['fecha_inicio','fecha_fin','estado_pedido'] },
      { tipo: 'pagos',         icon: '💳', label: 'Pagos',         configFields: ['fecha_inicio','fecha_fin','proveedor_id','modo_pagos'] },
    ]
  },
  {
    key: 'dinamico', label: '⚙️ Dinámico',
    reportes: [
      { tipo: 'dinamico', icon: '⚙️', label: 'Reporte dinámico', configFields: [] },
    ]
  },
  {
    key: 'catalogos', label: '📚 Catálogos',
    reportes: [
      { tipo: 'proveedores', icon: '🏭', label: 'Proveedores', configFields: ['fecha_inicio','fecha_fin'] },
      { tipo: 'productos',   icon: '📦', label: 'Productos',   configFields: ['fecha_inicio','fecha_fin','categoria'] },
      { tipo: 'clientes',    icon: '👥', label: 'Clientes',    configFields: ['fecha_inicio','fecha_fin'] },
    ]
  },
]

const REPORT_DEFS = MODULOS.flatMap(m => m.reportes)

// ── Columnas disponibles por módulo ──────────────────────────
const COLS_DISPONIBLES = {
  pedidos: [
    { key: 'codigo',       label: 'Código' },
    { key: 'estado',       label: 'Estado' },
    { key: 'proveedor',    label: 'Proveedor' },
    { key: 'cliente',      label: 'Cliente' },
    { key: 'fecha_pedido', label: 'Fecha pedido' },
    { key: 'incoterm',     label: 'Incoterm' },
    { key: 'moneda',       label: 'Moneda' },
    { key: 'lineas',       label: 'N° líneas' },
    { key: 'nota',         label: 'Nota' },
    { key: 'creado_en',    label: 'Creado en' },
  ],
  importaciones: [
    { key: 'codigo',      label: 'Código' },
    { key: 'estado',      label: 'Estado' },
    { key: 'fecha_union', label: 'Fecha unión' },
    { key: 'consolidado', label: 'Consolidado' },
    { key: 'pedidos',     label: 'N° pedidos' },
    { key: 'creado_en',   label: 'Creado en' },
  ],
  costeos: [
    { key: 'importaciones',  label: 'Importación' },
    { key: 'estado',         label: 'Estado' },
    { key: 'tc_usd_crc',     label: 'TC USD/CRC' },
    { key: 'costo_origen',   label: 'Costo origen' },
    { key: 'flete_maritimo', label: 'Flete marítimo' },
    { key: 'seguro',         label: 'Seguro' },
    { key: 'valor_cif',      label: 'Valor CIF' },
    { key: 'arancel_pct',    label: 'Arancel %' },
    { key: 'arancel_monto',  label: 'Arancel monto' },
    { key: 'agente_aduana',  label: 'Agente aduana' },
    { key: 'flete_cr',       label: 'Flete CR' },
    { key: 'bodega_costo',   label: 'Bodega' },
    { key: 'otros_costos',   label: 'Otros costos' },
    { key: 'costo_total_cr', label: 'Costo total CR' },
    { key: 'margen_global',  label: 'Margen %' },
    { key: 'precio_venta_total', label: 'P. Venta total' },
    { key: 'utilidad_bruta', label: 'Utilidad bruta' },
    { key: 'creado_por',     label: 'Creado por' },
    { key: 'creado_en',      label: 'Creado en' },
  ],
  seguimiento: [
    { key: 'codigo',      label: 'Código' },
    { key: 'estado',      label: 'Estado pedido' },
    { key: 'proveedor',   label: 'Proveedor' },
    { key: 'hitos',       label: 'Hitos' },
    { key: 'creado_en',   label: 'Creado en' },
  ],
  proveedores: [
    { key: 'nombre',           label: 'Nombre' },
    { key: 'pais',             label: 'País' },
    { key: 'ciudad',           label: 'Ciudad' },
    { key: 'moneda',           label: 'Moneda' },
    { key: 'incoterm_pref',    label: 'Incoterm' },
    { key: 'dias_transito',    label: 'Días tránsito' },
    { key: 'puerto_origen',    label: 'Puerto origen' },
    { key: 'condiciones_pago', label: 'Cond. pago' },
    { key: 'activo',           label: 'Estado' },
  ],
  productos: [
    { key: 'sku',            label: 'SKU' },
    { key: 'nombre',         label: 'Nombre' },
    { key: 'categoria',      label: 'Categoría' },
    { key: 'cod_arancelario',label: 'Cod. arancelario' },
    { key: 'arancel_pct',    label: 'Arancel %' },
    { key: 'peso_kg',        label: 'Peso (kg)' },
    { key: 'volumen_m3',     label: 'Volumen (m³)' },
    { key: 'activo',         label: 'Estado' },
  ],
  pagos: [
  { key: 'proveedor',    label: 'Proveedor' },
  { key: 'pedido',       label: 'Pedido' },
  { key: 'tipo',         label: 'Tipo' },
  { key: 'monto',        label: 'Monto' },
  { key: 'moneda',       label: 'Moneda' },
  { key: 'estado',       label: 'Estado' },
  { key: 'fecha_pago',   label: 'Fecha pago' },
  { key: 'fecha_limite', label: 'Fecha límite' },
  { key: 'metodo',       label: 'Método' },
  { key: 'referencia',   label: 'Referencia' },
],
  clientes: [
    { key: 'nombre',        label: 'Nombre' },
    { key: 'cedula',        label: 'Cédula' },
    { key: 'tipo',          label: 'Tipo' },
    { key: 'moneda',        label: 'Moneda' },
    { key: 'descuento_pct', label: 'Descuento %' },
    { key: 'email',         label: 'Email' },
    { key: 'activo',        label: 'Estado' },
  ],
}

// Valor de celda según key y fila
const getCellValue = (row, key, tipo) => {
  const fmt = (v) => v != null ? v : '—'
  const fmtN = (v) => v != null ? Number(v).toLocaleString('es-CR', { minimumFractionDigits: 2 }) : '—'

  if (tipo === 'pedidos') {
    if (key === 'proveedor')    return row.proveedor?.nombre
    if (key === 'cliente')      return row.cliente?.nombre
    if (key === 'fecha_pedido') return fmtDate(row.fecha_pedido)
    if (key === 'creado_en')    return fmtDate(row.creado_en)
    if (key === 'lineas')       return row._count?.lineas ?? row.lineas?.length
    if (key === 'estado')       return estadoLabel(row.estado)
  }
  if (tipo === 'importaciones') {
    if (key === 'fecha_union') return fmtDate(row.fecha_union)
    if (key === 'creado_en')   return fmtDate(row.creado_en)
    if (key === 'consolidado') return row.consolidado ? 'Sí' : 'No'
    if (key === 'pedidos')     return row._count?.pedidos ?? row.pedidos?.length
  }
  if (tipo === 'costeos') {
    if (key === 'creado_en')   return fmtDate(row.creado_en)
    if (['costo_origen','flete_maritimo','seguro','valor_cif','arancel_monto','agente_aduana',
         'flete_cr','bodega_costo','otros_costos','costo_total_cr','precio_venta_total','utilidad_bruta'].includes(key))
      return fmtN(row[key])
  }
  if (tipo === 'seguimiento') {
    if (key === 'proveedor') return row.proveedor?.nombre
    if (key === 'estado')    return estadoLabel(row.estado)
    if (key === 'creado_en') return fmtDate(row.creado_en)
    if (key === 'hitos')     return row.hitos?.map(h => `${h.tipo}:${h.estado}`).join(', ')
  }
  if (tipo === 'proveedores') {
    if (key === 'pais')   return row.pais?.nombre
    if (key === 'activo') return row.activo ? 'Activo' : 'Inactivo'
  }
  if (tipo === 'productos') {
    if (key === 'activo')    return row.activo ? 'Activo' : 'Inactivo'
    if (key === 'arancel_pct' || key === 'peso_kg' || key === 'volumen_m3') return fmt(row[key])
  }
if (tipo === 'pagos') {
  if (key === 'proveedor')    return row.proveedor?.nombre ?? '—'
  if (key === 'pedido')       return row.pedido?.codigo ?? '—'
  if (key === 'tipo')         return pagoTipoLabel(row.tipo)
  if (key === 'metodo')       return pagoMetodoLabel(row.metodo)
  if (key === 'monto')        return fmtCurrency(Number(row.monto||0), row.moneda)
  if (key === 'estado')       return pagoEstadoLabel(row.estado)
  if (key === 'fecha_pago')   return fmtDate(row.fecha_pago)
  if (key === 'fecha_limite') return fmtDate(row.fecha_limite)
}
  if (tipo === 'clientes') {
    if (key === 'activo') return row.activo ? 'Activo' : 'Inactivo'
    if (key === 'tipo')   return row.tipo
  }
  return fmt(row[key])
}

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
    modo_pagos: { 
      key: 'modo', 
      label: 'Agrupar por', 
      type: 'select', 
      options: [{value:'proveedor',label:'Proveedor'},
        {value:'pedido',label:'Pedido'}], 
        placeholder: 'Proveedor' },
    dias_limite: { key: 'dias_limite', label: 'Días límite', type: 'number', placeholder: '30' },
    dias_alerta: { key: 'dias_alerta', label: 'Días de alerta', type: 'number', placeholder: '7' },
    desde: { key: 'desde', label: 'Desde', type: 'date' },
    hasta: { key: 'hasta', label: 'Hasta', type: 'date' },
    top:          { key: 'top',          label: 'Top N',       type: 'number', placeholder: '20' },
    fecha_inicio: { key: 'fecha_inicio', label: 'Fecha inicio', type: 'date' },
    fecha_fin:    { key: 'fecha_fin',    label: 'Fecha fin',    type: 'date' },
    categoria:    { key: 'categoria',    label: 'Categoría',    type: 'text', placeholder: 'Ej: Motores' },
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
      {def.type === 'text' && (
        <input type="text" className={base} placeholder={def.placeholder ?? ''} value={val}
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


// ── Columnas merge por sección en orden jerárquico ────────────
const COLS_MERGE = {
  proveedores: [
    { key: 'prov_nombre',        label: 'Proveedor' },
    { key: 'prov_pais',          label: 'País' },
    { key: 'prov_ciudad',        label: 'Ciudad' },
    { key: 'prov_moneda',        label: 'Moneda prov.' },
    { key: 'prov_incoterm',      label: 'Incoterm prov.' },
    { key: 'prov_dias_transito', label: 'Días tránsito' },
  ],
  pedidos: [
    { key: 'ped_codigo',    label: 'Pedido' },
    { key: 'ped_estado',    label: 'Estado' },
    { key: 'ped_fecha',     label: 'Fecha pedido' },
    { key: 'ped_incoterm',  label: 'Incoterm' },
    { key: 'ped_moneda',    label: 'Moneda' },
    { key: 'ped_nota',      label: 'Nota' },
    { key: 'ped_creado_en', label: 'Creado en' },
  ],
  seguimiento: [
    { key: 'seg_prox_hito',       label: 'Próx. hito' },
    { key: 'seg_prox_fecha_plan', label: 'Fecha plan' },
    { key: 'seg_ult_hito',        label: 'Últ. completado' },
    { key: 'seg_ult_fecha_real',  label: 'Fecha real' },
  ],
  importaciones: [
    { key: 'imp_codigo',      label: 'Importación' },
    { key: 'imp_estado',      label: 'Estado imp.' },
    { key: 'imp_fecha_union', label: 'Fecha unión' },
    { key: 'imp_contenedor',  label: 'Contenedor' },
    { key: 'imp_eta_cr',      label: 'ETA CR' },
  ],
  costeos: [
    { key: 'cos_tc',             label: 'TC USD/CRC' },
    { key: 'cos_cif',            label: 'Valor CIF' },
    { key: 'cos_arancel',        label: 'Arancel' },
    { key: 'cos_flete',          label: 'Flete marítimo' },
    { key: 'cos_agente',         label: 'Agente aduana' },
    { key: 'cos_flete_cr',       label: 'Flete CR' },
    { key: 'cos_bodega',         label: 'Bodega' },
    { key: 'cos_total_cr',       label: 'Costo total CR' },
    { key: 'cos_margen',         label: 'Margen %' },
    { key: 'cos_pv_total',       label: 'P. Venta total' },
    { key: 'cos_utilidad',       label: 'Utilidad bruta' },
    { key: 'cos_lin_costo_unit', label: 'Costo unit CR' },
    { key: 'cos_lin_pv_unit',    label: 'P. Venta unit' },
    { key: 'cos_lin_pv_total',   label: 'P. Venta línea' },
    { key: 'cos_lin_utilidad',   label: 'Utilidad línea' },
  ],
  productos: [
    { key: 'prod_nombre',      label: 'Producto' },
    { key: 'prod_sku',         label: 'SKU' },
    { key: 'prod_categoria',   label: 'Categoría' },
    { key: 'prod_peso_kg',     label: 'Peso (kg)' },
    { key: 'prod_volumen_m3',  label: 'Volumen m³' },
    { key: 'prod_arancel_pct', label: 'Arancel prod. %' },
    { key: 'lin_cantidad',     label: 'Cantidad' },
    { key: 'lin_precio_unit',  label: 'Precio unit' },
    { key: 'lin_total',        label: 'Total línea' },
  ],
  clientes: [
    { key: 'cli_nombre',    label: 'Cliente' },
    { key: 'cli_tipo',      label: 'Tipo' },
    { key: 'cli_moneda',    label: 'Moneda cli.' },
    { key: 'cli_descuento', label: 'Descuento %' },
  ],
}
const JERARQUIA_FRONT = ['proveedores','pedidos','seguimiento','importaciones','costeos','productos','clientes']
const GRP_COLORS = {
  proveedores:'bg-violet-50', pedidos:'bg-tl-xl', seguimiento:'bg-yellow-50',
  importaciones:'bg-blue-50', costeos:'bg-green-50', productos:'bg-orange-50', clientes:'bg-pink-50'
}
const GRP_LABELS = {
  proveedores:'🏭 Proveedor', pedidos:'📋 Pedido', seguimiento:'⏱️ Seguimiento',
  importaciones:'🚢 Importación', costeos:'💰 Costeo', productos:'📦 Producto/Línea', clientes:'👥 Cliente'
}
const fmtMergeCell = (val, key) => {
  if (val == null) return '—'
  if (['ped_fecha','ped_creado_en','seg_prox_fecha_plan','seg_ult_fecha_real','imp_fecha_union','imp_eta_cr'].includes(key))
    return fmtDate(val)
  if (['cos_cif','cos_arancel','cos_flete','cos_agente','cos_flete_cr','cos_bodega','cos_total_cr',
       'cos_pv_total','cos_utilidad','cos_lin_costo_unit','cos_lin_pv_unit','cos_lin_pv_total',
       'cos_lin_utilidad','lin_precio_unit','lin_total'].includes(key))
    return fmtCurrency(val,'USD')
  if (key === 'cos_tc')     return `₡${Number(val).toLocaleString('es-CR',{minimumFractionDigits:2})}`
  if (key === 'cos_margen' || key === 'cos_lin_margen_pct') return `${val}%`
  if (key === 'ped_estado') return estadoLabel(val)
  return String(val)
}

// ── Componente principal ──────────────────────────────────────
export default function ReportesPage() {
  const [selected, setSelected] = useState(REPORT_DEFS[0]);
  const [config, setConfig] = useState({});
  const [columnasSel, setColumnasSel] = useState([]);
  const [seccionesDin, setSeccionesDin] = useState({
    pedidos:       { activa: false, config: {}, cols: [] },
    importaciones: { activa: false, config: {}, cols: [] },
    costeos:       { activa: false, config: {}, cols: [] },
    seguimiento:   { activa: false, config: {}, cols: [] },
    proveedores:   { activa: false, config: {}, cols: [] },
    productos:     { activa: false, config: {}, cols: [] },
    clientes:      { activa: false, config: {}, cols: [] },
  })
  const [fechaDinInicio, setFechaDinInicio] = useState('')
  const [fechaDinFin,    setFechaDinFin]    = useState('')
  const [resultadosDin,  setResultadosDin]  = useState(null)
  const [generandoDin,   setGenerandoDin]   = useState(false)
  const [resultadoMerge, setResultadoMerge] = useState(null)
  const [colsMerge,      setColsMerge]      = useState({})
  const [showSave, setShowSave] = useState(false);
  const [saveNombre, setSaveNombre] = useState('');

  const generar        = useGenerar();
  const saveReporte    = useSaveReporte();
  const deleteReporte  = useDeleteReporte();
  const { data: reportesGuardados = [] } = useReportes();
  const { data: proveedores = [] } = useProveedores();
  const { data: clientes    = [] } = useClientes();

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
    // Preseleccionar todas las columnas del módulo
    const cols = COLS_DISPONIBLES[def.tipo] || []
    setColumnasSel(cols.map(c => c.key))
  };

  const handleLoadSaved = (reporte) => {
    const def = REPORT_DEFS.find((d) => d.tipo === reporte.tipo);
    if (!def) return;
    setSelected(def);
    setConfig(reporte.config_json ?? {});
    generar.reset();
  };

  const handleGenerarDinamico = async () => {
    const activas = Object.entries(seccionesDin).filter(([,v]) => v.activa)
    if (!activas.length) return
    setGenerandoDin(true)
    setResultadoMerge(null)
    const colsSelec = {}
    activas.forEach(([tipo, sec]) => {
      colsSelec[tipo] = sec.cols.length > 0 ? sec.cols : (COLS_MERGE[tipo]||[]).map(c=>c.key)
    })
    setColsMerge(colsSelec)
    const mergeConfig = {
      secciones:    activas.map(([t])=>t),
      fecha_inicio: fechaDinInicio||undefined,
      fecha_fin:    fechaDinFin||undefined,
    }
    activas.forEach(([,sec]) => {
      Object.entries(sec.config).forEach(([k,v]) => { if(v) mergeConfig[k]=v })
    })
    try {
      const res = await api.post('/reportes/generar', { tipo: 'merge', config: mergeConfig })
      const data = res?.data?.data ?? res?.data ?? []
      setResultadoMerge(Array.isArray(data) ? data : [])
    } catch(e) {
      console.error('Merge error:', e)
      setResultadoMerge([])
    }
    setGenerandoDin(false)
  }

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
          <div className="p-3 space-y-3">
            {MODULOS.map(modulo => (
              <div key={modulo.key}>
                <div className="text-[10px] font-semibold text-mist uppercase tracking-wider mb-1.5">{modulo.label}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {modulo.reportes.map(def => (
                    <button key={def.tipo}
                      className={`btn btn-sm text-left justify-start text-[11px] ${selected?.tipo === def.tipo ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleSelect(def)}>
                      {def.icon} {def.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {reportesGuardados.length > 0 && (
            <>
              <div className="border-t border-border mx-3" />
              <div className="px-3 py-2">
                <div className="text-[11px] text-mist mb-2">Guardados</div>
                <div className="flex flex-col gap-1">
                  {reportesGuardados.map((r) => (
                    <div key={r.reporte_id} className="flex items-center gap-1">
                      <button
                        className={`btn btn-sm text-left justify-start text-[11.5px] flex-1 ${selected?.tipo === r.tipo && JSON.stringify(config) === JSON.stringify(r.config_json) ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleLoadSaved(r)}
                      >
                        {REPORT_DEFS.find((d) => d.tipo === r.tipo)?.icon ?? '📄'} {r.nombre}
                      </button>
                      <button
                        className="text-mist hover:text-rs text-sm leading-none px-1"
                        title="Eliminar"
                        onClick={() => deleteReporte.mutate(r.reporte_id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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

            {selected?.tipo === 'dinamico' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group">
                    <label className="form-label text-[11px]">Fecha inicio</label>
                    <input type="date" className="form-input h-8 text-xs" value={fechaDinInicio} onChange={e => setFechaDinInicio(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-[11px]">Fecha fin</label>
                    <input type="date" className="form-input h-8 text-xs" value={fechaDinFin} onChange={e => setFechaDinFin(e.target.value)} />
                  </div>
                </div>
                {[
                  { tipo: 'pedidos',       icon: '📋', label: 'Pedidos',       filtros: ['estado_pedido','proveedor_id','cliente_id'] },
                  { tipo: 'importaciones', icon: '🚢', label: 'Importaciones', filtros: ['estado_importacion'] },
                  { tipo: 'costeos',       icon: '💰', label: 'Costeo',        filtros: ['estado_costeo'] },
                  { tipo: 'seguimiento',   icon: '⏱️', label: 'Seguimiento',   filtros: ['estado_pedido'] },
                  
                  { tipo: 'proveedores',   icon: '🏭', label: 'Proveedores',   filtros: [] },
                  { tipo: 'productos',     icon: '📦', label: 'Productos',     filtros: ['categoria'] },
                  { tipo: 'clientes',      icon: '👥', label: 'Clientes',      filtros: [] },
                ].map(sec => {
                  const s = seccionesDin[sec.tipo]
                  const toggle = () => setSeccionesDin(prev => ({...prev,[sec.tipo]:{...prev[sec.tipo],activa:!s.activa,cols:!s.activa&&prev[sec.tipo].cols.length===0?(COLS_MERGE[sec.tipo]||[]).map(c=>c.key):prev[sec.tipo].cols}}))
                  return (
                    <div key={sec.tipo} className={`rounded-card border overflow-hidden ${s.activa?'border-tl/30':'border-border'}`}>
                      <div className={`flex items-center justify-between px-3 py-2 cursor-pointer ${s.activa?'bg-tl-xl':'bg-sur2 hover:bg-sur3'}`} onClick={toggle}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${s.activa?'bg-tl border-tl':'border-border'}`}>
                            {s.activa && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                          </div>
                          <span className="text-xs font-medium">{sec.icon} {sec.label}</span>
                        </div>
                        <span className="text-[10px] text-mist">{s.activa?'▲':'▼'}</span>
                      </div>
                      {s.activa && (
                        <div className="p-3 space-y-2 bg-sur">
                          {sec.filtros.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {sec.filtros.map(fk => {
                                const def = fieldDefs[fk]; if (!def) return null
                                return (
                                  <div key={fk} className="form-group">
                                    <label className="form-label text-[10px]">{def.label}</label>
                                    {def.type==='select'?(
                                      <select className="form-input h-7 text-xs" value={s.config[def.key]||''}
                                        onChange={e=>setSeccionesDin(prev=>({...prev,[sec.tipo]:{...prev[sec.tipo],config:{...prev[sec.tipo].config,[def.key]:e.target.value||undefined}}}))}>
                                        <option value="">Todos</option>
                                        {(def.options||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                    ):(
                                      <input type={def.type||'text'} className="form-input h-7 text-xs" placeholder={def.placeholder||''} value={s.config[def.key]||''}
                                        onChange={e=>setSeccionesDin(prev=>({...prev,[sec.tipo]:{...prev[sec.tipo],config:{...prev[sec.tipo].config,[def.key]:e.target.value||undefined}}}))}/> 
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-mist font-medium">Columnas</span>
                              <div className="flex gap-2">
                                <button type="button" className="text-[10px] text-tl hover:underline" onClick={()=>setSeccionesDin(prev=>({...prev,[sec.tipo]:{...prev[sec.tipo],cols:(COLS_MERGE[sec.tipo]||[]).map(c=>c.key)}}))}>Todas</button>
                                <button type="button" className="text-[10px] text-mist hover:underline" onClick={()=>setSeccionesDin(prev=>({...prev,[sec.tipo]:{...prev[sec.tipo],cols:[]}}))}>Ninguna</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(COLS_MERGE[sec.tipo]||[]).map(col=>(
                                <button key={col.key} type="button"
                                  onClick={()=>setSeccionesDin(prev=>{const cols=prev[sec.tipo].cols;return{...prev,[sec.tipo]:{...prev[sec.tipo],cols:cols.includes(col.key)?cols.filter(k=>k!==col.key):[...cols,col.key]}}})}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${s.cols.includes(col.key)?'bg-tl text-white border-tl':'bg-sur2 text-mist border-border hover:border-tl/40'}`}>
                                  {col.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button className="btn btn-primary w-full mt-2"
                  disabled={generandoDin||!Object.values(seccionesDin).some(s=>s.activa)}
                  onClick={handleGenerarDinamico}>
                  {generandoDin?'Generando...':'🚀 Generar reporte dinámico'}
                </button>
              </div>
            ) : (
            <>
            {selected && selected.configFields.length > 0 && (
              <div className={selected.configFields.length >= 2 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                {selected.configFields.map((fieldKey) => {
                  const def = fieldDefs[fieldKey];
                  if (!def) return null;
                  return <ConfigField key={fieldKey} def={def} value={config[def.key]} onChange={setConfigKey} />;
                })}
              </div>
            )}

            {/* Selector de columnas */}
            {COLS_DISPONIBLES[selected?.tipo] && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-mist font-medium">Columnas a mostrar</label>
                  <div className="flex gap-2">
                    <button className="text-[10px] text-tl hover:underline"
                      onClick={() => setColumnasSel(COLS_DISPONIBLES[selected.tipo].map(c => c.key))}>
                      Todas
                    </button>
                    <button className="text-[10px] text-mist hover:underline"
                      onClick={() => setColumnasSel([])}>
                      Ninguna
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLS_DISPONIBLES[selected.tipo].map(col => (
                    <button key={col.key} type="button"
                      onClick={() => setColumnasSel(prev =>
                        prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key]
                      )}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors
                        ${columnasSel.includes(col.key)
                          ? 'bg-tl text-white border-tl'
                          : 'bg-sur2 text-mist border-border hover:border-tl/40'}`}>
                      {col.label}
                    </button>
                  ))}
                </div>
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
            </>
            )}
          </div>
        </div>
      </div>

      {/* ── Resultado ── */}
      {resultado && (() => {
        const colsDef = COLS_DISPONIBLES[resultado.tipo] || []
        const colsMostrar = columnasSel.length > 0
          ? colsDef.filter(c => columnasSel.includes(c.key))
          : colsDef

        // Para costeos mostrar también desglose de líneas
        const esCosteo = resultado.tipo === 'costeos'

        // Datos para exportar
        const headers = colsMostrar.map(c => c.label)
        const rows    = filas.map(fila => colsMostrar.map(c => getCellValue(fila, c.key, resultado.tipo) ?? ''))

        return (
          <TableCard
            title={`${selected?.icon ?? ''} ${selected?.label ?? 'Resultado'}`}
            countLabel={`${resultado.total ?? filas.length} registros`}
            isEmpty={filas.length === 0}
            emptyMessage="El reporte no arrojó resultados con los filtros seleccionados"
            actions={filas.length > 0 && (
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm"
                  onClick={() => exportExcel(headers, rows, selected?.tipo ?? 'reporte')}>
                  📊 Excel
                </button>
                <button className="btn btn-outline btn-sm"
                  onClick={() => exportPdf(headers, rows, selected?.label ?? 'Reporte', selected?.tipo ?? 'reporte')}>
                  📄 PDF
                </button>
              </div>
            )}
          >
            {colsMostrar.length > 0 ? (
              <div className="overflow-x-auto">
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr className="bg-sur2">
                      {colsMostrar.map(c => (
                        <th key={c.key} className="text-[10px] font-semibold text-mist uppercase tracking-wider px-3 py-2 text-left border-b border-border whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, i) => (
                      <tr key={i} className="border-b border-border-lt hover:bg-sur2/50">
                        {colsMostrar.map(c => (
                          <td key={c.key} className="px-3 py-2 text-xs">
                            {getCellValue(fila, c.key, resultado.tipo) ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Desglose de líneas para costeos */}
                {esCosteo && filas.some(f => f.lineas?.length > 0) && (() => {
                  const todasLineas = filas.flatMap(f => (f.lineas||[]).map(l => ({ ...l, _imp: f.importaciones, _tc: f.tc_usd_crc })))
                  const tc = Number(filas[0]?.tc_usd_crc) || 1
                  const moneda = 'USD'
                  const fmt = (v) => fmtCurrency(v, moneda)

                  // Calcular distribución igual que en el wizard
                  const pesoTotal = todasLineas.reduce((s,l) => s + Number(l.peso_total_kg||0), 0)
                  const fobTotal  = todasLineas.reduce((s,l) => s + Number(l.total_linea||0), 0)

                  const calcLinea = (l, f) => {
                    const fobLinea  = Number(l.total_linea||0)
                    const cant      = Number(l.cantidad)||1
                    const pesoLinea = Number(l.peso_total_kg||0)
                    const pct       = pesoTotal > 0 ? pesoLinea/pesoTotal : (fobTotal > 0 ? fobLinea/fobTotal : 0)
                    const cif       = (Number(f.flete_maritimo)||0) + (Number(f.seguro)||0)
                    const fleteSeguro  = cif * pct
                    const cifLinea     = fobLinea + fleteSeguro
                    const impLinea     = (Number(f.arancel_monto)||0) * pct
                    const agenteLinea  = (Number(f.agente_aduana)||0) * pct
                    const fleteCrLinea = (Number(f.flete_cr)||0) * pct
                    const bodegaLinea  = (Number(f.bodega_costo)||0) * pct
                    const otrosLinea   = (Number(f.otros_costos)||0) * pct
                    const costoTotal   = cifLinea + impLinea + agenteLinea + fleteCrLinea + bodegaLinea + otrosLinea
                    const costoUnitCR  = costoTotal / cant
                    const margen       = Number(f.margen_global)||35
                    const pVentaUnit   = costoUnitCR * (1 + margen/100)
                    const pVentaTotal  = pVentaUnit * cant
                    const fobUnit      = fobLinea / cant
                    return { fobUnit, fleteSeguro, cifLinea, impLinea, agenteLinea, fleteCrLinea, bodegaLinea, otrosLinea, costoTotal, costoUnitCR, pVentaUnit, pVentaTotal, margen }
                  }

                  // Totales
                  const tots = filas.flatMap(f => (f.lineas||[]).map(l => calcLinea(l, f))).reduce((acc, c) => ({
                    fobLinea:     (acc.fobLinea||0)     + Number(c.fobUnit*(filas.find(ff=>ff.lineas?.includes(c))?.lineas?.[0]?.cantidad||1)||0),
                    fleteSeguro:  (acc.fleteSeguro||0)  + c.fleteSeguro,
                    cifLinea:     (acc.cifLinea||0)     + c.cifLinea,
                    impLinea:     (acc.impLinea||0)     + c.impLinea,
                    agenteLinea:  (acc.agenteLinea||0)  + c.agenteLinea,
                    fleteCrLinea: (acc.fleteCrLinea||0) + c.fleteCrLinea,
                    bodegaLinea:  (acc.bodegaLinea||0)  + c.bodegaLinea,
                    otrosLinea:   (acc.otrosLinea||0)   + c.otrosLinea,
                    costoTotal:   (acc.costoTotal||0)   + c.costoTotal,
                    pVentaTotal:  (acc.pVentaTotal||0)  + c.pVentaTotal,
                  }), {})

                  return (
                    <div className="mt-4 border-t border-border pt-3">
                      <div className="text-xs font-semibold text-ink mb-2 px-3">📦 Desglose por línea de producto</div>
                      <div className="overflow-x-auto">
                        <table style={{minWidth:'1100px',width:'100%',borderCollapse:'collapse'}}>
                          <thead>
                            <tr className="bg-sur3">
                              {['Importación','Producto','SKU','Cant.','FOB unit','Flete+Seguro','Costo CIF','Imp.dif.IVA','Agente','Flete CR','Bodega','Otros','Costo total','Costo unit CR','Margen %','P. Venta unit'].map(h => (
                                <th key={h} className="text-[9px] font-semibold text-mist uppercase tracking-wider px-2 py-2 text-right border-b border-border whitespace-nowrap first:text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filas.flatMap(f => (f.lineas||[]).map((l, li) => {
                              const c = calcLinea(l, f)
                              return (
                                <tr key={`${f.costeo_id}-${li}`} className="border-b border-border-lt hover:bg-sur2/50">
                                  <td className="px-2 py-1.5 text-xs text-mist text-left">{f.importaciones}</td>
                                  <td className="px-2 py-1.5 text-xs font-medium text-right">
                                    <div>{l.producto}</div>
                                    <div className="text-[10px] text-mist">{l.sku}</div>
                                  </td>
                                  <td className="px-2 py-1.5 text-xs text-mist text-right">{l.sku}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{Number(l.cantidad).toLocaleString('en')}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{fmt(c.fobUnit)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right text-mist">{fmt(c.fleteSeguro)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right font-semibold text-tl">{fmt(c.cifLinea)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{fmt(c.impLinea)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{fmt(c.agenteLinea)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{fmt(c.fleteCrLinea)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{fmt(c.bodegaLinea)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{fmt(c.otrosLinea)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right font-bold text-ink">{fmt(c.costoTotal)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right font-semibold">{fmt(c.costoUnitCR)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">{c.margen}%</td>
                                  <td className="px-2 py-1.5 text-xs text-right font-bold text-gd">{fmt(c.pVentaUnit)}</td>
                                </tr>
                              )
                            }))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-sur2 font-bold border-t-2 border-border">
                              <td colSpan={3} className="px-2 py-2 text-xs text-mist">TOTALES</td>
                              <td className="px-2 py-2 text-xs text-right">—</td>
                              <td className="px-2 py-2 text-xs text-right">—</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.fleteSeguro)}</td>
                              <td className="px-2 py-2 text-xs text-right text-tl">{fmt(tots.cifLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.impLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.agenteLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.fleteCrLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.bodegaLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right">{fmt(tots.otrosLinea)}</td>
                              <td className="px-2 py-2 text-xs text-right font-bold text-ink">{fmt(tots.costoTotal)}</td>
                              <td colSpan={3} className="px-2 py-2 text-xs text-right font-bold text-gd">{fmt(tots.pVentaTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-mist">Seleccioná al menos una columna para mostrar</div>
            )}
          </TableCard>
        )
      })()}

      {/* ── Resultados dinámicos ── */}
      {resultadosDin && Object.entries(resultadosDin).map(([tipo, res]) => {
        const colsDef     = COLS_DISPONIBLES[tipo] || []
        const colsKeys    = seccionesDin[tipo]?.cols || colsDef.map(c=>c.key)
        const colsMostrar = colsDef.filter(c => colsKeys.includes(c.key))
        const def         = REPORT_DEFS.find(d => d.tipo === tipo)
        return (
          <TableCard key={tipo}
            title={`${def?.icon??''} ${def?.label??tipo}`}
            countLabel={`${res.data?.length??0} registros`}
            isEmpty={!res.data?.length}
            emptyMessage="Sin resultados para este módulo con los filtros seleccionados"
          >
            {res.error ? (
              <div className="p-4 text-xs text-rs">{res.error}</div>
            ) : colsMostrar.length > 0 ? (
              <div className="overflow-x-auto">
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr className="bg-sur2">
                      {colsMostrar.map(c=>(
                        <th key={c.key} className="text-[10px] font-semibold text-mist uppercase tracking-wider px-3 py-2 text-left border-b border-border whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {res.data.map((fila,i)=>(
                      <tr key={i} className="border-b border-border-lt hover:bg-sur2/50">
                        {colsMostrar.map(c=>(
                          <td key={c.key} className="px-3 py-2 text-xs">{getCellValue(fila,c.key,tipo)??'—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-xs text-mist text-center">Seleccioná columnas para ver los datos</div>
            )}
          </TableCard>
        )
      })}

      {/* ── Resultado merge dinámico ── */}
      {resultadoMerge !== null && (() => {
        const grupos = JERARQUIA_FRONT
          .filter(sec => colsMerge[sec]?.length > 0)
          .map(sec => ({ sec, cols: (COLS_MERGE[sec]||[]).filter(c => colsMerge[sec].includes(c.key)) }))
          .filter(g => g.cols.length > 0)
        const colsPlanas = grupos.flatMap(g => g.cols)
        return (
          <TableCard title="⚙️ Reporte dinámico — vista unificada"
            countLabel={`${resultadoMerge.length} filas`}
            isEmpty={resultadoMerge.length === 0}
            emptyMessage="Sin resultados con los filtros seleccionados"
            actions={resultadoMerge.length > 0 && (
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={() => exportExcel(colsPlanas.map(c=>c.label), resultadoMerge.map(f=>colsPlanas.map(c=>fmtMergeCell(f[c.key],c.key))), 'reporte_merge')}>📊 Excel</button>
                <button className="btn btn-outline btn-sm" onClick={() => exportPdf(colsPlanas.map(c=>c.label), resultadoMerge.map(f=>colsPlanas.map(c=>fmtMergeCell(f[c.key],c.key))), 'Reporte dinámico', 'merge')}>📄 PDF</button>
              </div>
            )}>
            <div className="overflow-x-auto">
              <table style={{minWidth:`${colsPlanas.length*100}px`,width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>{grupos.map(g => (<th key={g.sec} colSpan={g.cols.length} className={`text-[10px] font-bold px-2 py-1.5 text-left border-b border-r border-border ${GRP_COLORS[g.sec]||'bg-sur2'}`}>{GRP_LABELS[g.sec]}</th>))}</tr>
                  <tr className="bg-sur2">{grupos.flatMap(g => g.cols.map((c,ci) => (<th key={c.key} className={`text-[9px] font-semibold text-mist uppercase tracking-wider px-2 py-2 text-left border-b border-border whitespace-nowrap ${ci===g.cols.length-1?'border-r':''}`}>{c.label}</th>)))}</tr>
                </thead>
                <tbody>
                  {resultadoMerge.map((fila,i) => (
                    <tr key={i} className="border-b border-border-lt hover:bg-sur2/50">
                      {grupos.flatMap(g => g.cols.map((c,ci) => (<td key={c.key} className={`px-2 py-1.5 text-xs ${ci===g.cols.length-1?'border-r border-border':''}`}>{fmtMergeCell(fila[c.key],c.key)}</td>)))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        )
      })()}

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
