import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePedido, useProveedores, useClientes, useProductos } from '../../hooks/useApi';

const schema = z.object({
  proveedor_id: z.coerce.number().int().positive('Requerido'),
  cliente_id: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  fecha_pedido: z.string().min(1, 'Requerido'),
  incoterm: z.enum(['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']),
  moneda: z.string().length(3),
  lineas: z
    .array(
      z.object({
        producto_id: z.coerce.number().int().positive('Requerido'),
        cantidad: z.coerce.number().positive('Requerido'),
        precio_unit: z.coerce.number().positive('Requerido'),
        nota: z.string().optional(),
      }),
    )
    .min(1, 'Agregá al menos una línea'),
});

export default function NuevoPedido() {
  const navigate = useNavigate();
  const { data: proveedores = [] } = useProveedores();
  const { data: clientes = [] } = useClientes();
  const { data: productos = [] } = useProductos();
  const { mutate, isPending, error } = useCreatePedido();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      incoterm: 'FOB',
      moneda: 'USD',
      lineas: [{ producto_id: '', cantidad: '', precio_unit: '', nota: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineas' });
  const lineas = watch('lineas');
  const total = lineas.reduce(
    (acc, l) => acc + (Number(l.cantidad) * Number(l.precio_unit) || 0),
    0,
  );

  const onSubmit = (data) => {
    const payload = {
      ...data,
      cliente_id: data.cliente_id ? Number(data.cliente_id) : undefined, // ← fix
      fecha_pedido: new Date(data.fecha_pedido).toISOString(),
      lineas: data.lineas.map((l) => ({
        producto_id: Number(l.producto_id),
        cantidad: Number(l.cantidad),
        precio_unit: Number(l.precio_unit),
        nota: l.nota || undefined,
      })),
    };
    mutate(payload, { onSuccess: () => navigate('/pedidos') });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-4xl">
      {/* Cabecera */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Datos del pedido</div>
        </div>
        <div className="card-body grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Proveedor *</label>
            <select {...register('proveedor_id')} className="form-input">
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => (
                <option key={p.proveedor_id} value={p.proveedor_id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {errors.proveedor_id && (
              <span className="text-xs text-rs">{errors.proveedor_id.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Cliente</label>
            <select {...register('cliente_id')} className="form-input">
              <option value="">Sin cliente asociado</option>
              {clientes.map((c) => (
                <option key={c.cliente_id} value={c.cliente_id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha del pedido *</label>
            <input type="date" {...register('fecha_pedido')} className="form-input" />
            {errors.fecha_pedido && (
              <span className="text-xs text-rs">{errors.fecha_pedido.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Incoterm *</label>
            <select {...register('incoterm')} className="form-input">
              {['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR'].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
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
        </div>
      </div>

      {/* Líneas */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 Líneas del pedido</div>
          <button
            type="button"
            className="btn btn-outline text-xs"
            onClick={() => append({ producto_id: '', cantidad: '', precio_unit: '', nota: '' })}
          >
            ＋ Agregar línea
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="w-24">Cantidad</th>
                <th className="w-28">Precio unit.</th>
                <th className="w-28">Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => {
                const sub = Number(lineas[i]?.cantidad) * Number(lineas[i]?.precio_unit) || 0;
                return (
                  <tr key={field.id}>
                    <td>
                      <select
                        {...register(`lineas.${i}.producto_id`)}
                        className="form-input h-8 text-xs"
                      >
                        <option value="">Seleccionar producto...</option>
                        {productos.map((p) => (
                          <option key={p.producto_id} value={p.producto_id}>
                            [{p.sku}] {p.nombre}
                          </option>
                        ))}
                      </select>
                      {errors.lineas?.[i]?.producto_id && (
                        <span className="text-[10px] text-rs">
                          {errors.lineas[i].producto_id.message}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        {...register(`lineas.${i}.cantidad`)}
                        className="form-input h-8 text-xs"
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`lineas.${i}.precio_unit`)}
                        className="form-input h-8 text-xs"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="font-semibold text-xs">
                      ${sub.toLocaleString('en', { minimumFractionDigits: 2 })}
                    </td>
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
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-sur2">
                <td
                  colSpan={3}
                  className="px-3 py-2.5 text-xs text-mist font-semibold uppercase tracking-wider"
                >
                  Total
                </td>
                <td className="px-3 py-2.5 font-bold text-ink">
                  ${total.toLocaleString('en', { minimumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {errors.lineas && typeof errors.lineas === 'object' && errors.lineas.message && (
          <div className="px-4 py-2 text-xs text-rs">{errors.lineas.message}</div>
        )}
      </div>

      {/* Error global */}
      {error && (
        <div className="bg-rs-l text-rs text-xs px-4 py-3 rounded-lg border border-rs/20">
          {error?.error?.message || 'Error al crear el pedido'}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/pedidos')}>
          ← Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Creando...' : '✓ Crear pedido'}
        </button>
      </div>
    </form>
  );
}
