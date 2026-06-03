import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePedido, useProveedores, useClientes, useProductos } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import api from '../../lib/api';

const schema = z.object({
  proveedor_id: z.coerce.number().int().positive('Requerido'),
  cliente_id:   z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  fecha_pedido: z.string().min(1, 'Requerido'),
  incoterm:     z.enum(['EXW','FOB','CIF','DAP','DDP','CFR']),
  moneda:       z.string().length(3),
  nota:         z.string().max(300).optional(),
  forma_pago:   z.string().optional(),
  lineas: z.array(z.object({
    linea_id:    z.number().optional(),
    producto_id: z.coerce.number().int().positive('Requerido'),
    cantidad:    z.coerce.number().positive('Requerido'),
    precio_unit: z.coerce.number().positive('Requerido'),
    nota:        z.string().max(200).optional(),
  })).min(1, 'Agregá al menos una línea'),
})

export default function EditarPedido() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const qc       = useQueryClient()

  const { data: pedido, isLoading: loadingPedido } = usePedido(id)
  const { data: proveedores = [] } = useProveedores()
  const { data: clientes    = [] } = useClientes()
  const { data: productos   = [] } = useProductos()

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      incoterm: 'FOB',
      moneda:   'USD',
      nota:     '',
      lineas:   [{ producto_id: '', cantidad: '', precio_unit: '', nota: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineas' })
  const lineas = watch('lineas')
  const total  = lineas.reduce((acc, l) => acc + (Number(l.cantidad) * Number(l.precio_unit) || 0), 0)

  // Precargar datos del pedido cuando lleguen
  useEffect(() => {
    if (!pedido) return
    reset({
      proveedor_id: pedido.proveedor_id,
      cliente_id:   pedido.cliente_id || '',
      fecha_pedido: pedido.fecha_pedido?.slice(0, 10),
      incoterm:     pedido.incoterm,
      moneda:       pedido.moneda,
      nota:         pedido.nota || '',
      forma_pago:   pedido.forma_pago || '',
      lineas: pedido.lineas?.map(l => ({
        linea_id:    l.linea_id,
        producto_id: l.producto_id,
        cantidad:    Number(l.cantidad),
        precio_unit: Number(l.precio_unit),
        nota:        l.nota || '',
      })) || [{ producto_id: '', cantidad: '', precio_unit: '', nota: '' }],
    })
  }, [pedido])

  const { mutate: actualizar, isPending, error } = useMutation({
    mutationFn: async (data) => {
      // 1. Actualizar cabecera
      await api.patch(`/pedidos/${id}`, {
        proveedor_id: Number(data.proveedor_id),
        cliente_id:   data.cliente_id ? Number(data.cliente_id) : undefined,
        incoterm:     data.incoterm,
        moneda:       data.moneda,
        nota:         data.nota || undefined,
        forma_pago:   data.forma_pago || undefined,
      })

      // 2. Sincronizar líneas
      const lineasOriginales = pedido?.lineas || []
      const lineasNuevas     = data.lineas

      for (const linea of lineasNuevas) {
        if (linea.linea_id) {
          // Actualizar línea existente
          await api.patch(`/pedidos/${id}/lineas/${linea.linea_id}`, {
            cantidad:    Number(linea.cantidad),
            precio_unit: Number(linea.precio_unit),
            nota:        linea.nota || undefined,
          })
        } else {
          // Agregar línea nueva
          await api.post(`/pedidos/${id}/lineas`, {
            producto_id: Number(linea.producto_id),
            cantidad:    Number(linea.cantidad),
            precio_unit: Number(linea.precio_unit),
            nota:        linea.nota || undefined,
          })
        }
      }

      // 3. Eliminar líneas removidas
      const idsNuevos     = lineasNuevas.filter(l => l.linea_id).map(l => l.linea_id)
      const lineasBorrar  = lineasOriginales.filter(l => !idsNuevos.includes(l.linea_id))
      for (const linea of lineasBorrar) {
        if (lineasOriginales.length > lineasBorrar.length) {
          await api.delete(`/pedidos/${id}/lineas/${linea.linea_id}`)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.invalidateQueries({ queryKey: ['pedido', String(id)] })
      navigate('/pedidos')
    },
  })

  // ── Estado de factura
  const [factura, setFactura]     = useState(null)   // factura existente
  const [fForm,   setFForm]       = useState(false)  // mostrar form
  const [fData,   setFData]       = useState({
    numero: '', fecha: '', monto: '', moneda: 'USD', tipo: 'comercial', nota: '', archivo: null
  })

  // Precargar factura si existe
  useEffect(() => {
    if (pedido?.facturas?.length > 0) {
      const f = pedido.facturas[0]
      setFactura(f)
      setFData({
        numero: f.numero || '',
        fecha:  f.fecha?.slice(0,10) || '',
        monto:  f.monto || '',
        moneda: f.moneda || 'USD',
        tipo:   f.tipo || 'comercial',
        nota:   f.nota || '',
      })
    }
  }, [pedido])

  const { mutate: guardarFactura, isPending: savingFactura } = useMutation({
    mutationFn: (formData) => factura
      ? api.patch(`/facturas/${factura.factura_id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post('/facturas', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      const f = res?.data || res
      setFactura(f)
      setFForm(false)
      qc.invalidateQueries({ queryKey: ['pedido', String(id)] })
    },
  })

  const { mutate: eliminarFactura } = useMutation({
    mutationFn: () => api.delete(`/facturas/${factura.factura_id}`),
    onSuccess: () => {
      setFactura(null)
      setFData({ numero: '', fecha: '', monto: '', moneda: 'USD', tipo: 'comercial', nota: '' })
      qc.invalidateQueries({ queryKey: ['pedido', String(id)] })
    },
  })

const editable        = pedido?.estado === 'borrador'
const facturaEditable = pedido && ['borrador','confirmado'].includes(pedido.estado)

  if (loadingPedido) return <div className="flex justify-center p-12"><Spinner /></div>
  if (!pedido)       return <div className="p-12 text-center text-mist">Pedido no encontrado</div>

  return (
    <form onSubmit={handleSubmit(d => actualizar(d))} className="space-y-4 max-w-4xl">

      {/* Banner si no es editable */}
      {!editable && (
        <div className="rounded-card border border-am/20 bg-yellow-50 px-4 py-3 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-xs font-semibold text-am">Pedido en modo solo lectura</div>
            <div className="text-xs text-am/80 mt-0.5">
              Este pedido está en estado <strong>{pedido.estado}</strong> y no puede ser editado.
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Editar pedido — {pedido.codigo}</div>
        </div>
        <div className="card-body grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Proveedor *</label>
            <select {...register('proveedor_id')} className="form-input" disabled={!editable}>
              <option value="">Seleccionar...</option>
              {proveedores.map(p => (
                <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
              ))}
            </select>
            {errors.proveedor_id && <span className="text-xs text-rs">{errors.proveedor_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Cliente</label>
            <select {...register('cliente_id')} className="form-input" disabled={!editable}>
              <option value="">Sin cliente asociado</option>
              {clientes.map(c => (
                <option key={c.cliente_id} value={c.cliente_id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha del pedido *</label>
            <input type="date" {...register('fecha_pedido')} className="form-input" disabled={!editable} />
            {errors.fecha_pedido && <span className="text-xs text-rs">{errors.fecha_pedido.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Incoterm *</label>
            <select {...register('incoterm')} className="form-input" disabled={!editable}>
              {['EXW','FOB','CIF','DAP','DDP','CFR'].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Moneda *</label>
            <select {...register('moneda')} className="form-input" disabled={!editable}>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="CNY">CNY — Yuan</option>
              <option value="CRC">CRC — Colón</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Forma de pago</label>
            <select {...register('forma_pago')} className="form-input" disabled={!editable}>
              <option value="">Sin definir</option>
              <option value="contado">Contado</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
              <option value="365">365 días</option>
            </select>
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Nota del pedido</label>
            <input
              {...register('nota')}
              className="form-input"
              placeholder="Observaciones generales del pedido (opcional)"
              disabled={!editable}
            />
          </div>
        </div>
      </div>

      {/* Líneas */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 Líneas del pedido</div>
          {editable && (
            <button
              type="button"
              className="btn btn-outline text-xs"
              onClick={() => append({ producto_id: '', cantidad: '', precio_unit: '', nota: '' })}
            >
              ＋ Agregar línea
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="w-24">Cantidad</th>
                <th className="w-28">Precio unit.</th>
                <th className="w-28">Subtotal</th>
                <th>Nota</th>
                {editable && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => {
                const sub = Number(lineas[i]?.cantidad) * Number(lineas[i]?.precio_unit) || 0
                const esNueva = !field.linea_id
                return (
                  <tr key={field.id}>
                    <td>
                      <select
                        {...register(`lineas.${i}.producto_id`)}
                        className="form-input h-8 text-xs"
                        disabled={!editable || !esNueva}
                      >
                        <option value="">Seleccionar producto...</option>
                        {productos.map(p => (
                          <option key={p.producto_id} value={p.producto_id}>[{p.sku}] {p.nombre}</option>
                        ))}
                      </select>
                      {errors.lineas?.[i]?.producto_id && (
                        <span className="text-[10px] text-rs">{errors.lineas[i].producto_id.message}</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number" step="0.001"
                        {...register(`lineas.${i}.cantidad`)}
                        className="form-input h-8 text-xs"
                        placeholder="0"
                        disabled={!editable}
                      />
                    </td>
                    <td>
                      <input
                        type="number" step="0.01"
                        {...register(`lineas.${i}.precio_unit`)}
                        className="form-input h-8 text-xs"
                        placeholder="0.00"
                        disabled={!editable}
                      />
                    </td>
                    <td className="font-semibold text-xs">
                      ${sub.toLocaleString('en', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <input
                        type="text"
                        {...register(`lineas.${i}.nota`)}
                        className="form-input h-8 text-xs"
                        placeholder="Nota opcional..."
                        disabled={!editable}
                      />
                    </td>
                    {editable && (
                      <td>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(i)}
                            className="text-mist hover:text-rs transition-colors text-base leading-none"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-sur2">
                <td colSpan={3} className="px-3 py-2.5 text-xs text-mist font-semibold uppercase tracking-wider">Total</td>
                <td className="px-3 py-2.5 font-bold text-ink">
                  ${total.toLocaleString('en', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={editable ? 2 : 1} />
              </tr>
            </tfoot>
          </table>
        </div>
        {errors.lineas?.message && (
          <div className="px-4 py-2 text-xs text-rs">{errors.lineas.message}</div>
        )}
      </div>

      {/* ── Factura */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🧾 Factura del proveedor</div>
          {facturaEditable && !fForm && (
            <button type="button" className="btn btn-outline text-xs"
              onClick={() => setFForm(true)}>
              {factura ? '✏️ Editar factura' : '＋ Agregar factura'}
            </button>
          )}
        </div>
        <div className="p-4">
          {/* Sin factura */}
          {!factura && !fForm && (
            <div className="py-4 text-center text-xs text-mist">
              Sin factura registrada
              {facturaEditable && <span> — usá el botón para agregar</span>}
            </div>
          )}

          {/* Factura existente */}
          {factura && !fForm && (
            <div className="rounded-card border border-tl/20 bg-tl-xl px-4 py-3 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><span className="text-mist">Número:</span> <span className="font-medium">{factura.numero}</span></div>
                <div><span className="text-mist">Fecha:</span> <span className="font-medium">{factura.fecha?.slice(0,10)}</span></div>
                <div><span className="text-mist">Tipo:</span> <span className="font-medium capitalize">{factura.tipo}</span></div>
                <div><span className="text-mist">Monto:</span> <span className="font-bold text-tl">{factura.moneda} {Number(factura.monto).toLocaleString('en',{minimumFractionDigits:2})}</span></div>
                <div><span className="text-mist">Moneda:</span> <span className="font-medium">{factura.moneda}</span></div>
              </div>
              {factura.nota && <div className="text-[10px] text-mist">📝 {factura.nota}</div>}
              {facturaEditable && (
                <div className="flex gap-2 pt-1">
                  <button type="button" className="btn btn-outline text-[10px] px-2 py-1"
                    onClick={() => setFForm(true)}>✏️ Editar</button>
                  <button type="button" className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs"
                    onClick={() => { if (window.confirm('¿Eliminar la factura?')) eliminarFactura() }}>🗑 Eliminar</button>
                </div>
              )}
            </div>
          )}

          {/* Formulario de factura */}
          {fForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Número de factura *</label>
                  <input className="form-input" value={fData.numero}
                    onChange={e => setFData(p => ({...p, numero: e.target.value}))}
                    placeholder="Ej: INV-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input type="date" className="form-input" value={fData.fecha}
                    onChange={e => setFData(p => ({...p, fecha: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto *</label>
                  <input type="number" step="0.01" className="form-input" value={fData.monto}
                    onChange={e => setFData(p => ({...p, monto: e.target.value}))}
                    placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Moneda *</label>
                  <select className="form-input" value={fData.moneda}
                    onChange={e => setFData(p => ({...p, moneda: e.target.value}))}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CNY">CNY</option>
                    <option value="CRC">CRC</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={fData.tipo}
                    onChange={e => setFData(p => ({...p, tipo: e.target.value}))}>
                    <option value="comercial">Comercial</option>
                    <option value="proforma">Proforma</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Nota</label>
                  <input className="form-input" value={fData.nota}
                    onChange={e => setFData(p => ({...p, nota: e.target.value}))}
                    placeholder="Observación opcional..." />
                </div>
              </div>

              {/* ── Archivo de factura */}
              <div className="form-group">
                <label className="form-label">📎 Archivo de factura</label>
                <label className="flex items-center gap-3 cursor-pointer rounded-card border-2 border-dashed border-border bg-sur2 px-4 py-3 hover:border-tl/40 transition-colors">
                  <span className="text-2xl">📄</span>
                  <div>
                    <div className="text-xs font-medium text-ink">
                      {fData.archivo ? fData.archivo.name : 'Seleccionar archivo...'}
                    </div>
                    <div className="text-[10px] text-mist">
                      {fData.archivo
                        ? `${(fData.archivo.size / 1024).toFixed(1)} KB`
                        : 'PDF, JPG, PNG, Excel — máx. 10MB'}
                    </div>
                  </div>
                  <input type="file" className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={e => setFData(p => ({...p, archivo: e.target.files?.[0] || null}))} />
                </label>
                {/* Archivo existente */}
                {!fData.archivo && factura?.archivo_url && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-tl">
                    <span>📄</span>
                    <a href={factura.archivo_url} target="_blank" rel="noreferrer"
                      className="hover:underline">Ver archivo actual</a>
                    <span className="text-mist">(se reemplaza al subir uno nuevo)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline text-xs"
                  onClick={() => { setFForm(false); setFData(p => ({...p, archivo: null})) }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary text-xs"
                  disabled={savingFactura || !fData.numero || !fData.fecha || !fData.monto}
                  onClick={() => {
                    const formData = new FormData()
                    formData.append('numero', fData.numero)
                    formData.append('fecha',  new Date(fData.fecha).toISOString())
                    formData.append('monto',  Number(fData.monto))
                    formData.append('moneda', fData.moneda)
                    formData.append('tipo',   fData.tipo)
                    if (fData.nota)    formData.append('nota',    fData.nota)
                    if (fData.archivo) formData.append('archivo', fData.archivo)
                    if (!factura) {
                      formData.append('pedido_id',    id)
                      formData.append('proveedor_id', pedido.proveedor_id)
                    }
                    guardarFactura(formData)
                  }}>
                  {savingFactura ? 'Guardando...' : '✓ Guardar factura'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="bg-rs-l text-rs text-xs px-4 py-3 rounded-lg border border-rs/20">
          {error?.message || 'Error al guardar el pedido'}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/pedidos')}>
          ← Volver
        </button>
        {editable && (
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'Guardando...' : '✓ Guardar cambios'}
          </button>
        )}
      </div>
    </form>
  )
}
