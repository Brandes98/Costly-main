import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft } from 'react-icons/fa';
import { TableCard, TableContainer } from '../../components/ui/Table';
import { usePedido, useUpdatePedido, useClientes, useProductos, useProveedores } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import { estadoPillClass, estadoLabel, fmtDate } from '../../lib/utils';
import api from '../../lib/api';

// ── Schema editar cabecera
const schemaCab = z.object({
  incoterm:              z.enum(['EXW','FOB','CIF','DAP','DDP','CFR']),
  moneda:                z.string().length(3),
  cliente_id:            z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  proveedor_id:          z.coerce.number().int().positive('Requerido'),
  nota_cambio_proveedor: z.string().optional(),
  forma_pago:            z.string().optional(),
}).superRefine((data, ctx) => {
  // La nota es obligatoria solo si el usuario cambió el proveedor
  // Se valida en el componente comparando con el valor original
})

// ── Schema línea
const schemaLinea = z.object({
  producto_id: z.coerce.number().int().positive('Requerido'),
  cantidad:    z.coerce.number().positive('Requerido'),
  precio_unit: z.coerce.number().positive('Requerido'),
  nota:        z.string().optional(),
})

// ── Modal editar línea existente
function ModalEditarLinea({ linea, pedidoId, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schemaLinea.pick({ cantidad: true, precio_unit: true, nota: true })),
    defaultValues: {
      cantidad:    Number(linea.cantidad),
      precio_unit: Number(linea.precio_unit),
      nota:        linea.nota || '',
    }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.patch(`/pedidos/${pedidoId}/lineas/${linea.linea_id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedido', String(pedidoId)] }); onClose() }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-xs text-ink">{linea.producto?.nombre}</div>
            <div className="text-[10px] text-mist">Editar línea #{linea.numero}</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="form-group">
            <label className="form-label">Cantidad *</label>
            <input type="number" step="0.001" {...register('cantidad')} className="form-input" />
            {errors.cantidad && <span className="text-xs text-rs">{errors.cantidad.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Precio unitario *</label>
            <input type="number" step="0.01" {...register('precio_unit')} className="form-input" />
            {errors.precio_unit && <span className="text-xs text-rs">{errors.precio_unit.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Nota</label>
            <input type="text" {...register('nota')} className="form-input" placeholder="Opcional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary text-xs" disabled={isPending} onClick={handleSubmit(d => mutate(d))}>
            {isPending ? 'Guardando...' : '✓ Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal agregar línea
function ModalAgregarLinea({ pedidoId, onClose }) {
  const qc = useQueryClient()
  const { data: productos = [] } = useProductos()
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schemaLinea),
    defaultValues: { producto_id: '', cantidad: '', precio_unit: '', nota: '' }
  })

  const cant = watch('cantidad')
  const prec = watch('precio_unit')
  const sub  = (Number(cant) * Number(prec)) || 0

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post(`/pedidos/${pedidoId}/lineas`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedido', String(pedidoId)] }); onClose() }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-semibold text-ink">Agregar línea</div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="form-group">
            <label className="form-label">Producto *</label>
            <select {...register('producto_id')} className="form-input">
              <option value="">Seleccionar...</option>
              {productos.map(p => (
                <option key={p.producto_id} value={p.producto_id}>[{p.sku}] {p.nombre}</option>
              ))}
            </select>
            {errors.producto_id && <span className="text-xs text-rs">{errors.producto_id.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Cantidad *</label>
              <input type="number" step="0.001" {...register('cantidad')} className="form-input" placeholder="0" />
              {errors.cantidad && <span className="text-xs text-rs">{errors.cantidad.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Precio unit. *</label>
              <input type="number" step="0.01" {...register('precio_unit')} className="form-input" placeholder="0.00" />
              {errors.precio_unit && <span className="text-xs text-rs">{errors.precio_unit.message}</span>}
            </div>
          </div>
          {sub > 0 && (
            <div className="flex justify-between rounded-card bg-tl-xl border border-tl/20 px-3 py-2 text-xs">
              <span className="text-mist">Subtotal</span>
              <span className="font-semibold text-tl">${sub.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Nota</label>
            <input type="text" {...register('nota')} className="form-input" placeholder="Opcional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary text-xs" disabled={isPending} onClick={handleSubmit(d => mutate(d))}>
            {isPending ? 'Agregando...' : '＋ Agregar línea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal
export default function PedidoDetalle() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const qc       = useQueryClient()

  const [modalCab,    setModalCab]    = useState(false)
  const [lineaEdit,   setLineaEdit]   = useState(null)
  const [modalAgregar,setModalAgregar]= useState(false)
  const [confirmDel,  setConfirmDel]  = useState(null)

  const { data: pedido, isLoading } = usePedido(id)
  const { data: clientes    = [] }  = useClientes()
  const { data: proveedores = [] }  = useProveedores()
  const { mutate: actualizar, isPending: guardando } = useUpdatePedido()

  // Eliminar línea
  const { mutate: eliminarLinea, isPending: eliminando } = useMutation({
    mutationFn: (linea_id) => api.delete(`/pedidos/${id}/lineas/${linea_id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedido', String(id)] }); setConfirmDel(null) }
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schemaCab),
  })

  const abrirEditarCab = () => {
    reset({
      incoterm:              pedido.incoterm   || 'FOB',
      moneda:                pedido.moneda     || 'USD',
      cliente_id:            pedido.cliente_id || '',
      proveedor_id:          pedido.proveedor_id,
      nota_cambio_proveedor: '',
      forma_pago:            pedido.forma_pago || '',
    })
    setModalCab(true)
  }

  const onSubmitCab = (data) => {
    const proveedorCambio = Number(data.proveedor_id) !== pedido.proveedor_id
    if (proveedorCambio && !data.nota_cambio_proveedor?.trim()) {
      alert('Debés ingresar una justificación para cambiar el proveedor.')
      return
    }
    actualizar(
      {
        id:                    pedido.pedido_id,
        incoterm:              data.incoterm,
        moneda:                data.moneda,
        cliente_id:            data.cliente_id ? Number(data.cliente_id) : undefined,
        proveedor_id:          Number(data.proveedor_id),
        nota_cambio_proveedor: proveedorCambio ? data.nota_cambio_proveedor : undefined,
        forma_pago:            data.forma_pago || undefined,
      },
      { onSuccess: () => setModalCab(false) }
    )
  }

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!pedido)   return <div className="p-12 text-center text-mist">Pedido no encontrado</div>

  const total    = pedido.lineas?.reduce((s, l) => s + Number(l.total_linea), 0) || 0
  const editable = ['borrador','confirmado'].includes(pedido.estado)

  return (
    <div className="space-y-4">

      {/* Banner advertencia — solo cuando NO es editable */}
      {!editable && (
        <div className="rounded-card border border-am/20 bg-yellow-50 px-4 py-3 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-xs font-semibold text-am">Pedido en modo solo lectura</div>
            <div className="text-xs text-am/80 mt-0.5">
              Este pedido está en estado <strong>{estadoLabel(pedido.estado)}</strong> y no puede ser editado.
              Solo se pueden editar pedidos en estado <strong>Borrador</strong> o <strong>Confirmado</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <button className="btn btn-outline px-2 text-xs" onClick={() => navigate(-1)}>
            <FaArrowLeft aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-medium text-ink">{pedido.codigo}</h1>
            <div className="mt-0.5 text-xs text-mist">
              {pedido.proveedor?.nombre} · {fmtDate(pedido.fecha_pedido)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${estadoPillClass(pedido.estado)}`}>
            {estadoLabel(pedido.estado)}
          </span>
          {editable && (
            <button className="btn btn-outline text-xs" onClick={abrirEditarCab}>
              ✏️ Editar cabecera
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="kpi">
          <div className="text-xs text-mist mb-1">Proveedor</div>
          <div className="text-sm font-semibold text-ink">{pedido.proveedor?.nombre || '—'}</div>
        </div>
        <div className="kpi">
          <div className="text-xs text-mist mb-1">Incoterm</div>
          <span className="incb">{pedido.incoterm}</span>
        </div>
        <div className="kpi">
          <div className="text-xs text-mist mb-1">Moneda</div>
          <div className="text-sm font-semibold text-ink">{pedido.moneda}</div>
        </div>
        <div className="kpi">
          <div className="text-xs text-mist mb-1">Total estimado</div>
          <div className="text-sm font-bold text-tl">
            {pedido.moneda} {total.toLocaleString('en', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="kpi">
          <div className="text-xs text-mist mb-1">Forma de pago</div>
          <div className="text-sm font-semibold text-ink">
            {pedido.forma_pago ? (pedido.forma_pago === 'contado' ? 'Contado' : pedido.forma_pago + ' días') : '—'}
          </div>
        </div>
      </div>

      {/* Líneas */}
      <TableCard
        title="📦 Líneas del pedido"
        countLabel={`${pedido.lineas?.length || 0} líneas`}
        isEmpty={!pedido.lineas?.length}
        emptyMessage="No hay líneas para mostrar"
        action={editable && (
          <button className="btn btn-outline text-xs" onClick={() => setModalAgregar(true)}>
            ＋ Agregar línea
          </button>
        )}
      >
        <TableContainer>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unit.</th>
              <th>Total</th>
              {editable && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {pedido.lineas?.map((linea) => (
              <tr key={linea.linea_id}>
                <td className="text-mist">{linea.numero}</td>
                <td>
                  <div className="font-medium">{linea.producto?.nombre}</div>
                  <div className="text-[10px] text-mist">{linea.producto?.sku}</div>
                </td>
                <td>{Number(linea.cantidad).toLocaleString()}</td>
                <td>${Number(linea.precio_unit).toFixed(2)}</td>
                <td className="font-semibold">
                  ${Number(linea.total_linea).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                </td>
                {editable && (
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button
                        className="btn btn-outline text-[10px] px-2 py-1 hover:border-tl hover:text-tl"
                        onClick={() => setLineaEdit(linea)}
                      >
                        ✏️
                      </button>
                      {pedido.lineas.length > 1 && (
                        <button
                          className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs"
                          onClick={() => setConfirmDel(linea)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sur2">
              <td colSpan={editable ? 4 : 4} className="px-3 py-2 text-xs text-mist font-semibold">Total</td>
              <td className="px-3 py-2 font-bold text-ink">
                ${total.toLocaleString('en', { minimumFractionDigits: 2 })}
              </td>
              {editable && <td />}
            </tr>
          </tfoot>
        </TableContainer>
      </TableCard>

      {/* Hitos */}
      {pedido.hitos?.length > 0 && (
        <TableCard title="🎯 Hitos">
          <div className="card-body flex flex-col gap-2">
            {pedido.hitos.map((hito) => (
              <div key={hito.hito_id} className="flex items-center justify-between border-b border-border-lt py-1.5 last:border-b-0">
                <span className="text-xs">{hito.nombre || hito.tipo?.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mist">{fmtDate(hito.fecha_plan)}</span>
                  <span className={`pill ${hito.estado === 'completado' ? 'pill-green' : 'pill-gray'}`}>
                    {hito.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TableCard>
      )}

      {/* ── Modal editar cabecera */}
      {modalCab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-card border border-border bg-sur shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="font-semibold text-ink">Editar cabecera</div>
                <div className="text-xs text-mist">{pedido.codigo}</div>
              </div>
              <button className="text-mist hover:text-ink" onClick={() => setModalCab(false)}>✕</button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <select {...register('proveedor_id')} className="form-input">
                  {proveedores.map(p => (
                    <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              {/* Nota solo si cambia el proveedor — se valida en onSubmitCab */}
              <div className="form-group">
                <label className="form-label">Justificación cambio proveedor</label>
                <input
                  type="text"
                  {...register('nota_cambio_proveedor')}
                  className="form-input"
                  placeholder="Requerido solo si cambiás el proveedor"
                />
                <span className="text-[10px] text-mist">Si no cambiás el proveedor, dejá este campo vacío.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Incoterm *</label>
                <select {...register('incoterm')} className="form-input">
                  {['EXW','FOB','CIF','DAP','DDP','CFR'].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Moneda *</label>
                <select {...register('moneda')} className="form-input">
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="CNY">CNY — Yuan</option>
                  <option value="CRC">CRC — Colón</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de pago</label>
                <select {...register('forma_pago')} className="form-input">
                  <option value="">Sin definir</option>
                  <option value="contado">Contado</option>
                  <option value="30">30 días</option>
                  <option value="60">60 días</option>
                  <option value="90">90 días</option>
                  <option value="180">180 días</option>
                  <option value="365">365 días</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cliente asociado</label>
                <select {...register('cliente_id')} className="form-input">
                  <option value="">Sin cliente asociado</option>
                  {clientes.map(c => (
                    <option key={c.cliente_id} value={c.cliente_id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button className="btn btn-outline text-xs" onClick={() => setModalCab(false)}>Cancelar</button>
              <button className="btn btn-primary text-xs" disabled={guardando} onClick={handleSubmit(onSubmitCab)}>
                {guardando ? 'Guardando...' : '✓ Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar línea */}
      {lineaEdit && (
        <ModalEditarLinea
          linea={lineaEdit}
          pedidoId={pedido.pedido_id}
          onClose={() => setLineaEdit(null)}
        />
      )}

      {/* ── Modal agregar línea */}
      {modalAgregar && (
        <ModalAgregarLinea
          pedidoId={pedido.pedido_id}
          onClose={() => setModalAgregar(false)}
        />
      )}

      {/* ── Confirm eliminar línea */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
            <div className="font-semibold text-ink">¿Eliminar línea?</div>
            <div className="text-xs text-mist">
              Se eliminará <strong className="text-ink">{confirmDel.producto?.nombre}</strong> del pedido. Esta acción no se puede deshacer.
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline text-xs" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button
                className="btn btn-danger text-xs"
                disabled={eliminando}
                onClick={() => eliminarLinea(confirmDel.linea_id)}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
