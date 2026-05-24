import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft } from 'react-icons/fa';
import { useImportacion, usePedidos, useProveedores } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';
import {
  estadoLabel, estadoPillClass, fmtDate,
  importacionEstadoLabel, importacionEstadoPillClass,
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
  estado:       z.string().min(1, 'Requerido'),
  fecha_union:  z.string().optional().or(z.literal('')),
  nota:         z.string().max(300).optional().or(z.literal('')),
  contenedores: z.array(z.object({
    nombre: z.string().min(1, 'Requerido').max(50),
    nota:   z.string().max(200).optional().or(z.literal('')),
  })),
  proveedores_transporte: z.array(z.object({
    proveedor_id: z.coerce.number().int().positive('Requerido'),
    nota:         z.string().max(200).optional().or(z.literal('')),
  })),
  proveedores_flete: z.array(z.object({
    proveedor_id: z.coerce.number().int().positive('Requerido'),
    nota:         z.string().max(200).optional().or(z.literal('')),
  })),
})

export default function EditarImportacion() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const qc       = useQueryClient()

  const { data: importacion, isLoading } = useImportacion(id)
  const { data: todosPedidos = [] }      = usePedidos()
  const { data: proveedores = [] }       = useProveedores()

  const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { contenedores: [], proveedores_transporte: [], proveedores_flete: [] }
  })

  const { fields: contFields,      append: appendCont,      remove: removeCont      } = useFieldArray({ control, name: 'contenedores' })
  const { fields: transpFields,    append: appendTransp,    remove: removeTransp    } = useFieldArray({ control, name: 'proveedores_transporte' })
  const { fields: fleteFields,     append: appendFlete,     remove: removeFlete     } = useFieldArray({ control, name: 'proveedores_flete' })

  // Precargar datos
  useEffect(() => {
    if (!importacion) return
    reset({
      estado:      importacion.estado,
      fecha_union: importacion.fecha_union ? importacion.fecha_union.slice(0, 10) : '',
      nota:        importacion.nota || '',
      contenedores: (importacion.contenedores || []).map(c => ({
        contenedor_id: c.contenedor_id,
        nombre: c.codigo || c.nombre || '',
        nota:   c.nota   || '',
      })),
      proveedores_transporte: (importacion.proveedores_transporte || []).map(p => ({
        proveedor_id: p.proveedor_id,
        nota:         p.nota || '',
      })),
      proveedores_flete: (importacion.proveedores_flete || []).map(p => ({
        proveedor_id: p.proveedor_id,
        nota:         p.nota || '',
      })),
    })
  }, [importacion])

  // Guardar cambios generales
  const { mutate: actualizar, isPending: guardando, error } = useMutation({
    mutationFn: async (data) => {
      // 1. Actualizar datos generales
      await api.patch(`/importaciones/${id}`, {
        estado:      data.estado,
        fecha_union: data.fecha_union ? new Date(data.fecha_union).toISOString() : undefined,
        nota:        data.nota || undefined,
      })
      // 2. Sincronizar contenedores
      const contActuales = importacion?.contenedores || []
      const contNuevos   = data.contenedores.filter(c => !c.contenedor_id)
      const contExistentes = data.contenedores.filter(c => c.contenedor_id)

      // Agregar nuevos
      for (const c of contNuevos) {
        await api.post(`/importaciones/${id}/contenedores`, { codigo: c.nombre, nota: c.nota || undefined })
      }
      // Actualizar existentes
      for (const c of contExistentes) {
        await api.patch(`/importaciones/${id}/contenedores/${c.contenedor_id}`, { codigo: c.nombre, nota: c.nota || undefined })
      }
      // Eliminar los que ya no están
      const idsNuevos = contExistentes.map(c => c.contenedor_id)
      for (const c of contActuales) {
        if (!idsNuevos.includes(c.contenedor_id)) {
          await api.delete(`/importaciones/${id}/contenedores/${c.contenedor_id}`)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importacion', id] })
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      navigate(`/importaciones/${id}`)
    },
  })

  // Agregar pedido
  const { mutate: agregarPedido, isPending: agregando } = useMutation({
    mutationFn: (pedido_id) => api.post(`/importaciones/${id}/pedidos`, { pedido_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importacion', id] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
    },
    onError: (e) => alert(e?.message || 'No se pudo agregar el pedido'),
  })

  // Quitar pedido
  const { mutate: quitarPedido } = useMutation({
    mutationFn: (pedido_id) => api.delete(`/importaciones/${id}/pedidos/${pedido_id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importacion', id] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
    },
    onError: (e) => alert(e?.message || 'No se pudo quitar el pedido'),
  })

  const fechaUnionWatch = watch('fecha_union')
  const pedidos         = importacion?.pedidos || []
  const editable        = importacion?.estado !== 'cerrada'

  // Validación fecha vs pedidos
  const pedidosConFechaPosterna = fechaUnionWatch
    ? pedidos.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) > new Date(fechaUnionWatch))
    : []

  // Pedidos disponibles — sin importación asignada y no cancelados/cerrados
  const pedidosDisponibles = todosPedidos.filter(p =>
    !p.importacion_id &&
    !['cancelado','cerrado'].includes(p.estado)
  )

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!importacion) return <div className="p-12 text-center text-mist">Importación no encontrada</div>

  return (
    <div className="space-y-4 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-outline px-2 text-xs" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">Editar {importacion.codigo}</h1>
            <div className="text-xs text-mist">
              {importacion.consolidado ? 'Importación consolidada' : 'Importación individual'} · {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <span className={`pill ${importacionEstadoPillClass(importacion.estado)}`}>
          {importacionEstadoLabel(importacion.estado)}
        </span>
      </div>

      {/* Banner solo lectura */}
      {!editable && (
        <div className="rounded-card border border-am/20 bg-yellow-50 px-4 py-3 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-xs font-semibold text-am">Importación cerrada — solo lectura</div>
            <div className="text-xs text-am/80 mt-0.5">No se puede editar una importación cerrada.</div>
          </div>
        </div>
      )}

      {/* ── Datos generales */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Datos generales</div></div>
        <div className="card-body grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Estado *</label>
            <select {...register('estado')} className="form-input" disabled={!editable}>
              {ESTADOS_IMP.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            {errors.estado && <span className="text-xs text-rs">{errors.estado.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de unión</label>
            <input type="date" {...register('fecha_union')} className="form-input" disabled={!editable} />
            {pedidosConFechaPosterna.length > 0 && (
              <div className="mt-1.5 rounded-card border border-rs/20 bg-rs-l px-3 py-2 text-xs text-rs">
                <div className="font-semibold mb-1">⚠️ Fecha inválida — pedidos con fecha posterior:</div>
                {pedidosConFechaPosterna.map(p => (
                  <div key={p.pedido_id}>• <strong>{p.codigo}</strong> — {fmtDate(p.fecha_pedido)}</div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Nota</label>
            <input {...register('nota')} className="form-input"
              placeholder="Observación opcional..." disabled={!editable} />
          </div>
        </div>
      </div>

      {/* ── Contenedores */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🚢 Contenedores</div>
          {editable && (
            <button
              type="button"
              className="btn btn-outline text-xs"
              onClick={() => appendCont({ nombre: '', nota: '' })}
            >
              ＋ Agregar contenedor
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {contFields.length === 0 ? (
            <div className="py-4 text-center text-xs text-mist">
              Sin contenedores asignados
              {editable && <span className="ml-1">— usá el botón para agregar</span>}
            </div>
          ) : (
            contFields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-2 gap-3 rounded-card border border-border bg-sur2 p-3">
                <div className="form-group">
                  <label className="form-label">Nombre del contenedor *</label>
                  <input
                    {...register(`contenedores.${i}.nombre`)}
                    className="form-input"
                    placeholder="Ej: MSCU1234567"
                    disabled={!editable}
                  />
                  {errors.contenedores?.[i]?.nombre && (
                    <span className="text-xs text-rs">{errors.contenedores[i].nombre.message}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Nota</label>
                  <div className="flex gap-2">
                    <input
                      {...register(`contenedores.${i}.nota`)}
                      className="form-input"
                      placeholder="Nota opcional..."
                      disabled={!editable}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => removeCont(i)}
                        className="btn btn-outline px-2 hover:border-rs hover:text-rs flex-shrink-0"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Proveedores de transporte */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🚛 Proveedores de transporte</div>
          {editable && (
            <button type="button" className="btn btn-outline text-xs"
              onClick={() => appendTransp({ proveedor_id: '', nota: '' })}>
              ＋ Agregar
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {transpFields.length === 0 ? (
            <div className="py-4 text-center text-xs text-mist">
              Sin proveedores de transporte asignados
              {editable && <span className="ml-1">— usá el botón para agregar</span>}
            </div>
          ) : transpFields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-2 gap-3 rounded-card border border-border bg-sur2 p-3">
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <select {...register(`proveedores_transporte.${i}.proveedor_id`)} className="form-input" disabled={!editable}>
                  <option value="">Seleccionar...</option>
                  {proveedores.map(p => (
                    <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.proveedores_transporte?.[i]?.proveedor_id && (
                  <span className="text-xs text-rs">{errors.proveedores_transporte[i].proveedor_id.message}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Nota</label>
                <div className="flex gap-2">
                  <input {...register(`proveedores_transporte.${i}.nota`)} className="form-input"
                    placeholder="Nota opcional..." disabled={!editable} />
                  {editable && (
                    <button type="button" onClick={() => removeTransp(i)}
                      className="btn btn-outline px-2 hover:border-rs hover:text-rs flex-shrink-0">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Proveedores de flete */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🚢 Proveedores de flete</div>
          {editable && (
            <button type="button" className="btn btn-outline text-xs"
              onClick={() => appendFlete({ proveedor_id: '', nota: '' })}>
              ＋ Agregar
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {fleteFields.length === 0 ? (
            <div className="py-4 text-center text-xs text-mist">
              Sin proveedores de flete asignados
              {editable && <span className="ml-1">— usá el botón para agregar</span>}
            </div>
          ) : fleteFields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-2 gap-3 rounded-card border border-border bg-sur2 p-3">
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <select {...register(`proveedores_flete.${i}.proveedor_id`)} className="form-input" disabled={!editable}>
                  <option value="">Seleccionar...</option>
                  {proveedores.map(p => (
                    <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.proveedores_flete?.[i]?.proveedor_id && (
                  <span className="text-xs text-rs">{errors.proveedores_flete[i].proveedor_id.message}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Nota</label>
                <div className="flex gap-2">
                  <input {...register(`proveedores_flete.${i}.nota`)} className="form-input"
                    placeholder="Nota opcional..." disabled={!editable} />
                  {editable && (
                    <button type="button" onClick={() => removeFlete(i)}
                      className="btn btn-outline px-2 hover:border-rs hover:text-rs flex-shrink-0">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pedidos actuales */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 Pedidos de la importación</div>
          <span className="text-xs text-mist">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-4 space-y-2">
          {pedidos.length === 0 ? (
            <div className="py-4 text-center text-xs text-mist">Sin pedidos asociados</div>
          ) : (
            pedidos.map(p => (
              <div key={p.pedido_id} className="flex items-center justify-between rounded-card border border-tl/20 bg-tl-xl px-3 py-2.5">
                <div>
                  <div className="text-xs font-medium">{p.codigo}</div>
                  <div className="text-[10px] text-mist">{p.proveedor?.nombre} · {estadoLabel(p.estado)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`pill ${estadoPillClass(p.estado)}`}>{estadoLabel(p.estado)}</span>
                  {editable && pedidos.length > 1 && (
                    <button
                      className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs"
                      onClick={() => quitarPedido(p.pedido_id)}
                    >
                      ✕ Quitar
                    </button>
                  )}
                  {pedidos.length <= 1 && editable && (
                    <span className="text-[9px] text-mist italic">Mínimo 1</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Pedidos disponibles para agregar */}
      {editable && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">➕ Agregar pedidos</div>
            <span className="text-xs text-mist">{pedidosDisponibles.length} disponibles</span>
          </div>
          <div className="p-4 space-y-2">
            {pedidosDisponibles.length === 0 ? (
              <div className="py-4 text-center text-xs text-mist">
                No hay pedidos sin importación disponibles
              </div>
            ) : (
              pedidosDisponibles.map(p => (
                <div key={p.pedido_id}
                  className="flex items-center justify-between rounded-card border border-border bg-sur px-3 py-2.5 hover:border-tl/40 transition-colors">
                  <div>
                    <div className="text-xs font-medium">{p.codigo}</div>
                    <div className="text-[10px] text-mist">
                      {p.proveedor?.nombre} · {estadoLabel(p.estado)} · {p._count?.lineas ?? 0} líneas
                      {/* Validación: ya en otra importación */}
                      {p.importacion_id && (
                        <span className="ml-1 text-rs font-semibold">⚠ Ya en importación</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary text-[10px] px-2 py-1"
                    disabled={agregando || !!p.importacion_id}
                    onClick={() => agregarPedido(p.pedido_id)}
                  >
                    ＋ Agregar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rs-l text-rs text-xs px-4 py-3 rounded-lg border border-rs/20">
          {error?.message || 'Error al guardar'}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between">
        <button className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        {editable && (
          <button
            className="btn btn-primary"
            disabled={guardando || pedidosConFechaPosterna.length > 0}
            onClick={handleSubmit(d => actualizar(d))}
          >
            {guardando ? 'Guardando...' : '✓ Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  )
}
