import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaArrowLeft } from 'react-icons/fa';
import Spinner from '../../components/ui/Spinner';
import { TableCard, TableContainer } from '../../components/ui/Table';
import { useImportacion, useTramiteAduana, usePedidos } from '../../hooks/useApi';
import api from '../../lib/api';
import {
  estadoLabel, estadoPillClass, fmtCurrency, fmtDate,
  importacionEstadoLabel, importacionEstadoPillClass,
  tramiteEstadoLabel, tramiteEstadoPillClass,
} from '../../lib/utils';

const ESTADOS_IMP = [
  { value: 'en_proceso',   label: 'En proceso'   },
  { value: 'en_transito',  label: 'En tránsito'  },
  { value: 'en_puerto_cr', label: 'En puerto CR' },
  { value: 'en_aduana',    label: 'En aduana'    },
  { value: 'en_bodega',    label: 'En bodega'    },
  { value: 'cerrada',      label: 'Cerrada'      },
]

const schema = z.object({
  estado:      z.string().min(1, 'Requerido'),
  contenedor:  z.string().max(50).optional().or(z.literal('')),
  fecha_union: z.string().optional().or(z.literal('')),
  nota:        z.string().max(300).optional().or(z.literal('')),
})

function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map(p => p.proveedor?.nombre).filter(Boolean))]
}

// ── Confirm eliminar con manejo de error
function ConfirmEliminar({ codigo, eliminando, onCancel, onConfirm }) {
  const [error, setError] = useState(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
        <div className="font-semibold text-ink">¿Eliminar importación?</div>
        <div className="text-xs text-mist">
          Se eliminará <strong className="text-ink">{codigo}</strong> y los pedidos asociados
          quedarán sin importación asignada. Esta acción no se puede deshacer.
        </div>
        {error && (
          <div className="rounded-card border border-rs/20 bg-rs-l px-3 py-2 text-xs text-rs">
            ⚠️ {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline text-xs" onClick={() => { onCancel(); setError(null) }}>
            Cancelar
          </button>
          <button
            className="btn btn-danger text-xs"
            disabled={eliminando}
            onClick={() => onConfirm(undefined, {
              onError: (err) => setError(err?.message || 'No se pudo eliminar la importación. Hay un costeo asociado')
            })}
          >
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ImportacionDetalle() {
  const navigate             = useNavigate()
  const { id }               = useParams()
  const qc                   = useQueryClient()
  const [modalEdit,    setModalEdit]    = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(false)
  const [modalPedidos, setModalPedidos] = useState(false)

  const { data: importacion, isLoading } = useImportacion(id)
  const { data: tramite }                = useTramiteAduana(id)
  const { data: todosPedidos = [] }      = usePedidos()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  // ── Editar importación
  const { mutate: editar, isPending: editando } = useMutation({
    mutationFn: (data) => api.patch(`/importaciones/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importacion', id] })
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      setModalEdit(false)
    },
  })

  // ── Eliminar importación
  const { mutate: eliminar, isPending: eliminando } = useMutation({
    mutationFn: () => api.delete(`/importaciones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      navigate('/importaciones')
    },
  })

  // ── Agregar pedido a la importación
  const { mutate: agregarPedido, isPending: agregando } = useMutation({
    mutationFn: (pedido_id) => api.post(`/importaciones/${id}/pedidos`, { pedido_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importacion', id] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })

  // ── Quitar pedido de la importación
  const { mutate: quitarPedido } = useMutation({
    mutationFn: (pedido_id) => api.delete(`/importaciones/${id}/pedidos/${pedido_id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importacion', id] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })

  const abrirEditar = () => {
    reset({
      estado:      importacion.estado,
      contenedor:  importacion.contenedor  || '',
      fecha_union: importacion.fecha_union
        ? importacion.fecha_union.slice(0, 10)
        : '',
      nota: '',
    })
    setModalEdit(true)
  }

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!importacion) return <div className="p-12 text-center text-mist">Importación no encontrada</div>

  const pedidos     = importacion.pedidos || []
  const proveedores = resumenProveedores(pedidos)
  const editable    = importacion.estado !== 'cerrada'

  // Pedidos disponibles: sin importación asignada y no cancelados/cerrados
  const pedidosDisponibles = todosPedidos.filter(p =>
    !p.importacion_id &&
    !['cancelado','cerrado'].includes(p.estado)
  )

  // Pedidos ya en esta importación (para validación visual)
  const pedidosEnEstaImp = new Set(pedidos.map(p => p.pedido_id))

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button className="btn btn-outline px-2 text-xs" onClick={() => navigate(-1)}>
            <FaArrowLeft aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">{importacion.codigo}</h1>
            <div className="mt-0.5 text-xs text-mist">
              {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} · {fmtDate(importacion.fecha_union || importacion.creado_en)}
              {importacion.contenedor && <span className="ml-2 incb">{importacion.contenedor}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${importacionEstadoPillClass(importacion.estado)}`}>
            {importacionEstadoLabel(importacion.estado)}
          </span>
          {editable && (
            <>
              <button className="btn btn-outline text-xs" onClick={() => setModalPedidos(true)}>
                📦 Editar pedidos
              </button>
              <button className="btn btn-outline text-xs" onClick={abrirEditar}>
                ✏️ Editar
              </button>
              <button className="btn btn-danger text-xs" onClick={() => setConfirmDel(true)}>
                🗑 Eliminar
              </button>
            </>
          )}
          {!editable && (
            <div className="rounded-card border border-am/20 bg-yellow-50 px-3 py-1.5 text-xs text-am">
              ⚠️ Importación cerrada — solo lectura
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
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
          <div className="text-2xl font-bold text-ink">{importacion.contenedor || '—'}</div>
          <div className="text-[11px] text-mist">Contenedor</div>
        </div>
      </div>

      {/* Trámite DUA */}
      {tramite && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏛️ Trámite DUA</div>
            <span className={`pill ${tramiteEstadoPillClass(tramite.estado)}`}>
              {tramiteEstadoLabel(tramite.estado)}
            </span>
          </div>
          <div className="card-body grid grid-cols-2 gap-3 md:grid-cols-3 text-xs">
            <div><div className="text-mist mb-0.5">DUA número</div><div className="font-medium">{tramite.dua_numero || '—'}</div></div>
            <div><div className="text-mist mb-0.5">Fecha DUA</div><div className="font-medium">{fmtDate(tramite.fecha_dua)}</div></div>
            <div><div className="text-mist mb-0.5">TC Hacienda</div><div className="font-medium">{tramite.tc_hacienda ? `₡${Number(tramite.tc_hacienda).toFixed(2)}` : '—'}</div></div>
            <div><div className="text-mist mb-0.5">Almacén fiscal</div><div className="font-medium">{tramite.almacen_fiscal || '—'}</div></div>
            <div><div className="text-mist mb-0.5">Valor CIF CR</div><div className="font-medium">{tramite.valor_cif_cr ? fmtCurrency(Number(tramite.valor_cif_cr), 'USD') : '—'}</div></div>
            <div><div className="text-mist mb-0.5">Total tributos</div><div className="font-semibold text-rs">{tramite.total_tributos ? fmtCurrency(Number(tramite.total_tributos), 'USD') : '—'}</div></div>
          </div>
        </div>
      )}

      {/* Pedidos */}
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
              {editable && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {pedidos.map(pedido => (
              <tr
                key={pedido.pedido_id}
                className="cursor-pointer"
                onClick={() => navigate(`/pedidos/${pedido.pedido_id}`)}
              >
                <td><strong>{pedido.codigo}</strong></td>
                <td>{pedido.proveedor?.nombre || `Proveedor #${pedido.proveedor_id}`}</td>
                <td>
                  <span className={`pill ${estadoPillClass(pedido.estado)}`}>
                    {estadoLabel(pedido.estado)}
                  </span>
                </td>
                <td>{pedido.incoterm || '—'}</td>
                <td>{pedido.moneda || '—'}</td>
                {editable && (
                  <td onClick={e => e.stopPropagation()}>
                    {pedidos.length > 1 && (
                      <button
                        className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs"
                        onClick={() => quitarPedido(pedido.pedido_id)}
                        title="Quitar de esta importación"
                      >
                        ✕ Quitar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      {/* ── Modal editar pedidos */}
      {modalPedidos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-lg rounded-card border border-border bg-sur shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="font-semibold text-ink">Editar pedidos</div>
                <div className="text-xs text-mist">{importacion.codigo}</div>
              </div>
              <button className="text-mist hover:text-ink" onClick={() => setModalPedidos(false)}>✕</button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">

              {/* Pedidos actuales */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-mist mb-2">
                  Pedidos en esta importación ({pedidos.length})
                </div>
                <div className="space-y-1.5">
                  {pedidos.map(p => (
                    <div key={p.pedido_id} className="flex items-center justify-between rounded-card border border-tl/30 bg-tl-xl px-3 py-2">
                      <div>
                        <div className="text-xs font-medium">{p.codigo}</div>
                        <div className="text-[10px] text-mist">{p.proveedor?.nombre} · {estadoLabel(p.estado)}</div>
                      </div>
                      {pedidos.length > 1 && (
                        <button
                          className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs"
                          onClick={() => quitarPedido(p.pedido_id)}
                        >
                          ✕ Quitar
                        </button>
                      )}
                      {pedidos.length === 1 && (
                        <span className="text-[9px] text-mist italic">Mínimo 1 pedido</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pedidos disponibles para agregar */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-mist mb-2">
                  Pedidos disponibles para agregar ({pedidosDisponibles.length})
                </div>
                {pedidosDisponibles.length === 0 ? (
                  <div className="rounded-card border border-border py-4 text-center text-xs text-mist">
                    No hay pedidos sin importación disponibles
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pedidosDisponibles.map(p => (
                      <div key={p.pedido_id} className="flex items-center justify-between rounded-card border border-border bg-sur px-3 py-2 hover:border-tl/40 transition-colors">
                        <div>
                          <div className="text-xs font-medium">{p.codigo}</div>
                          <div className="text-[10px] text-mist">
                            {p.proveedor?.nombre} · {estadoLabel(p.estado)}
                            {/* Validación: si el pedido tiene importacion_id diferente */}
                            {p.importacion_id && p.importacion_id !== Number(id) && (
                              <span className="ml-1 text-rs font-semibold">⚠ Ya en otra importación</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-primary text-[10px] px-2 py-1"
                          disabled={agregando}
                          onClick={() => agregarPedido(p.pedido_id)}
                        >
                          ＋ Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-border px-5 py-3">
              <button className="btn btn-primary text-xs" onClick={() => setModalPedidos(false)}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar */}
      {modalEdit && (() => {
        // Validación visual de fecha vs pedidos
        const fechaUnionWatch = watch('fecha_union')
        const pedidosConFechaPosterna = fechaUnionWatch
          ? pedidos.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) > new Date(fechaUnionWatch))
          : []

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-card border border-border bg-sur shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="font-semibold text-ink">Editar importación</div>
                <div className="text-xs text-mist">{importacion.codigo}</div>
              </div>
              <button className="text-mist hover:text-ink" onClick={() => setModalEdit(false)}>✕</button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="form-group">
                <label className="form-label">Estado *</label>
                <select {...register('estado')} className="form-input">
                  {ESTADOS_IMP.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
                {errors.estado && <span className="text-xs text-rs">{errors.estado.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Contenedor</label>
                <input
                  {...register('contenedor')}
                  className="form-input"
                  placeholder="Ej: MSCU1234567"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de unión</label>
                <input
                  type="date"
                  {...register('fecha_union')}
                  className="form-input"
                />
                {/* ── Advertencia si la fecha es anterior a algún pedido */}
                {pedidosConFechaPosterna.length > 0 && (
                  <div className="mt-1.5 rounded-card border border-rs/20 bg-rs-l px-3 py-2 text-xs text-rs">
                    <div className="font-semibold mb-1">⚠️ Fecha inválida</div>
                    <div>La fecha de la importación debe ser posterior a la fecha de todos los pedidos. Los siguientes pedidos tienen fecha posterior:</div>
                    <ul className="mt-1 space-y-0.5">
                      {pedidosConFechaPosterna.map(p => (
                        <li key={p.pedido_id}>
                          • <strong>{p.codigo}</strong> — {fmtDate(p.fecha_pedido)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Nota</label>
                <input
                  {...register('nota')}
                  className="form-input"
                  placeholder="Observación opcional..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button className="btn btn-outline text-xs" onClick={() => setModalEdit(false)}>Cancelar</button>
              <button
                className="btn btn-primary text-xs"
                disabled={editando || pedidosConFechaPosterna.length > 0}
                onClick={handleSubmit(data => editar({
                  estado:      data.estado,
                  contenedor:  data.contenedor  || undefined,
                  fecha_union: data.fecha_union  ? new Date(data.fecha_union).toISOString() : undefined,
                  nota:        data.nota         || undefined,
                }))}
              >
                {editando ? 'Guardando...' : '✓ Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── Confirm eliminar */}
      {confirmDel && (
        <ConfirmEliminar
          codigo={importacion.codigo}
          eliminando={eliminando}
          onCancel={() => setConfirmDel(false)}
          onConfirm={eliminar}
        />
      )}
    </div>
  )
}
