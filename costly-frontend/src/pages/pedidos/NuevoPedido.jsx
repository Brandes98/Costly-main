import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePedido, useProveedores, useClientes, useProductos } from '../../hooks/useApi';
import * as XLSX from 'xlsx' 
const schema = z.object({
  proveedor_id: z.coerce.number().int().positive('Requerido'),
  cliente_id:   z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  fecha_pedido: z.string().min(1, 'Requerido'),
  incoterm:     z.enum(['EXW','FOB','CIF','DAP','DDP','CFR']),
  moneda:       z.string().length(3),
  nota:         z.string().max(300).optional(),
  forma_pago:   z.string().optional(),
  lineas: z.array(z.object({
    producto_id: z.coerce.number().int().positive('Requerido'),
    cantidad:    z.coerce.number().positive('Requerido'),
    precio_unit: z.coerce.number().positive('Requerido'),
    nota:        z.string().max(200).optional(),
  })).min(1, 'Agregá al menos una línea'),
});

// ── SearchableSelect reutilizable
function SearchableSelect({ options, value, onChange, placeholder, searchPlaceholder, renderOption, renderSelected }) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = options.filter(o =>
    !query || renderOption(o).toLowerCase().includes(query.toLowerCase())
  )
  const selected = options.find(o => String(o.value) === String(value))

  return (
    <div className="relative" ref={ref}>
      <button type="button"
        onClick={() => { setOpen(v => !v); setQuery('') }}
        className="form-input w-full text-left flex items-center justify-between h-9 text-xs">
        <span className={selected ? 'text-ink' : 'text-mist'}>
          {selected ? (renderSelected ? renderSelected(selected) : renderOption(selected)) : placeholder}
        </span>
        <span className="text-mist text-[10px] ml-2 shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-card border border-border bg-sur shadow-xl">
          <div className="p-2 border-b border-border">
            <input autoFocus type="text"
              className="form-input h-7 text-xs w-full"
              placeholder={searchPlaceholder || 'Buscar...'}
              value={query}
              onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scroll">
            <button type="button"
              className="w-full text-left px-3 py-2 text-xs text-mist hover:bg-sur2"
              onClick={() => { onChange(''); setOpen(false) }}>
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-mist text-center">Sin resultados</div>
            ) : filtered.map(o => (
              <button key={o.value} type="button"
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-sur2
                  ${String(o.value) === String(value) ? 'bg-tl-xl text-tl font-semibold' : 'text-ink'}`}
                onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}>
                {renderOption(o)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NuevoPedido() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const duplicado = location.state
  const { data: proveedores = [] } = useProveedores()
  const { data: clientes    = [] } = useClientes()
  const { data: productos   = [] } = useProductos()
  const { mutate, isPending, error } = useCreatePedido()

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      incoterm:   'FOB',
      moneda:     'USD',
      nota:       '',
      forma_pago: 'contado',
      lineas:     [{ producto_id: '', cantidad: '', precio_unit: '', nota: '' }],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lineas' })

  useEffect(() => {
    if (!duplicado) return
    const { proveedor_id, cliente_id, incoterm, moneda, nota, lineas } = duplicado
    if (proveedor_id) setValue('proveedor_id', proveedor_id)
    if (cliente_id)   setValue('cliente_id',   cliente_id)
    if (incoterm)     setValue('incoterm',      incoterm)
    if (moneda)       setValue('moneda',        moneda)
    if (nota)         setValue('nota',          nota)
    if (lineas?.length) replace(lineas)
  }, [])

  const lineas  = watch('lineas')
  const wProvId = watch('proveedor_id')
  const wCliId  = watch('cliente_id')
  const total   = lineas.reduce((acc, l) => acc + (Number(l.cantidad) * Number(l.precio_unit) || 0), 0)

  const provOpts = proveedores.map(p => ({ value: p.proveedor_id, label: p.nombre, pais: p.pais?.bandera }))
  const cliOpts  = clientes.map(c => ({ value: c.cliente_id, label: c.nombre }))
  const prodOpts = productos.map(p => ({ value: p.producto_id, label: p.nombre, sku: p.sku }))

  const onSubmit = (data) => {
    const payload = {
      ...data,
      cliente_id:   data.cliente_id ? Number(data.cliente_id) : undefined,
      nota:         data.nota || undefined,
      forma_pago:   data.forma_pago || undefined,
      fecha_pedido: new Date(data.fecha_pedido).toISOString(),
      lineas: data.lineas.map((l) => ({
        producto_id: Number(l.producto_id),
        cantidad:    Number(l.cantidad),
        precio_unit: Number(l.precio_unit),
        nota:        l.nota || undefined,
      })),
    }
    mutate(payload, { onSuccess: () => navigate('/pedidos') })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-4xl">
      
      {duplicado?.duplicadoDe && (
        <div className="rounded-card border border-tl/20 bg-tl-xl px-4 py-3 flex items-center gap-3">
          <span>📋</span>
          <div className="text-xs text-tl">
            Duplicado de <strong>{duplicado.duplicadoDe}</strong> — revisá los datos antes de guardar.
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Datos del pedido</div>
        </div>
        <div className="card-body grid grid-cols-2 gap-4">

          <div className="form-group">
            <label className="form-label">Proveedor *</label>
            <SearchableSelect
              options={provOpts}
              value={wProvId}
              onChange={v => setValue('proveedor_id', v, { shouldValidate: true })}
              placeholder="Seleccionar proveedor..."
              searchPlaceholder="Buscar por nombre..."
              renderOption={o => `${o.pais || ''} ${o.label}`.trim()}
            />
            {errors.proveedor_id && <span className="text-xs text-rs">{errors.proveedor_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Cliente</label>
            <SearchableSelect
              options={cliOpts}
              value={wCliId}
              onChange={v => setValue('cliente_id', v)}
              placeholder="Sin cliente asociado"
              searchPlaceholder="Buscar cliente..."
              renderOption={o => o.label}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha del pedido *</label>
            <input type="date" {...register('fecha_pedido')} className="form-input" />
            {errors.fecha_pedido && <span className="text-xs text-rs">{errors.fecha_pedido.message}</span>}
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
            <input {...register('nota')} className="form-input"
              placeholder="Observaciones generales del pedido (opcional)" />
          </div>
        </div>
      </div>

      <div className="card">
       <div className="card-header">
  <div className="card-title">📦 Líneas del pedido</div>
  <div className="flex gap-2">
    <button type="button" className="btn btn-outline text-xs"
      onClick={() => {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([
          ['sku*', 'cantidad*', 'precio_unit*', 'nota'],
          ['MTR-001', '100', '12.50', ''],
          ['// Usá el SKU del producto de la hoja Ref_Productos', '', '', ''],
        ])
        XLSX.utils.book_append_sheet(wb, ws, 'Lineas')
        const wsRef = XLSX.utils.aoa_to_sheet([
          ['producto_id', 'sku', 'nombre'],
          ...prodOpts.map(p => [p.value, p.sku, p.label]),
        ])
        XLSX.utils.book_append_sheet(wb, wsRef, 'Ref_Productos')
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const url = URL.createObjectURL(new Blob([buf]))
        const a = document.createElement('a')
        a.href = url; a.download = 'plantilla_lineas.xlsx'; a.click()
        URL.revokeObjectURL(url)
      }}>
      📥 Plantilla líneas
    </button>

    <label className="btn btn-outline text-xs cursor-pointer">
      📊 Cargar Excel
      <input type="file" className="hidden" accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0]; if (!file) return
          const reader = new FileReader()
          reader.onload = (ev) => {
            const wb   = XLSX.read(ev.target.result, { type: 'array' })
            const ws   = wb.Sheets['Lineas']
            if (!ws) { alert('El archivo debe tener una hoja llamada "Lineas"'); return }
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
            const errores = []
            const nuevasLineas = []

            for (const [i, row] of rows.entries()) {
              const sku         = String(row['sku*'] || row['sku'] || '').trim()
              if (sku.startsWith('//')) continue

              const cantidad    = parseFloat(row['cantidad*']    || row['cantidad'])
              const precio_unit = parseFloat(row['precio_unit*'] || row['precio_unit'])

              if (!sku)                         { errores.push(`Fila ${i+2}: SKU requerido`); continue }
              if (!cantidad || cantidad <= 0)    { errores.push(`Fila ${i+2}: cantidad inválida`); continue }
              if (!precio_unit || precio_unit <= 0) { errores.push(`Fila ${i+2}: precio_unit inválido`); continue }

              const prod = prodOpts.find(p => p.sku?.toLowerCase() === sku.toLowerCase())
              if (!prod) { errores.push(`Fila ${i+2}: SKU "${sku}" no existe`); continue }

              nuevasLineas.push({
                producto_id: String(prod.value),
                cantidad:    String(cantidad),
                precio_unit: String(precio_unit),
                nota:        String(row['nota'] || ''),
              })
            }

            if (errores.length) alert(`⚠️ Errores:\n${errores.join('\n')}`)
            if (nuevasLineas.length) {
  // Si solo hay una línea vacía (la default), reemplazala
  const soloVacia = fields.length === 1 && 
    !lineas[0]?.producto_id && !lineas[0]?.cantidad && !lineas[0]?.precio_unit
  
  if (soloVacia) {
    replace(nuevasLineas)
  } else {
    nuevasLineas.forEach(l => append(l))
  }
  alert(`✅ ${nuevasLineas.length} línea${nuevasLineas.length !== 1 ? 's' : ''} agregada${nuevasLineas.length !== 1 ? 's' : ''}`)
}
          }
          reader.readAsArrayBuffer(file)
          e.target.value = ''
        }} />
    </label>

    <button type="button" className="btn btn-outline text-xs"
      onClick={() => append({ producto_id: '', cantidad: '', precio_unit: '', nota: '' })}>
      ＋ Agregar línea
    </button>
  </div>
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
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => {
                const sub    = Number(lineas[i]?.cantidad) * Number(lineas[i]?.precio_unit) || 0
                const prodId = watch(`lineas.${i}.producto_id`)
                return (
                  <tr key={field.id}>
                    <td className="min-w-[240px]">
                      <SearchableSelect
                        options={prodOpts}
                        value={prodId}
                        onChange={v => setValue(`lineas.${i}.producto_id`, v, { shouldValidate: true })}
                        placeholder="Seleccionar producto..."
                        searchPlaceholder="Buscar por nombre o SKU..."
                        renderOption={o => `[${o.sku}] ${o.label}`}
                        renderSelected={o => `[${o.sku}] ${o.label}`}
                      />
                      {errors.lineas?.[i]?.producto_id && (
                        <span className="text-[10px] text-rs">{errors.lineas[i].producto_id.message}</span>
                      )}
                    </td>
                    <td>
                      <input type="number" step="0.001"
                        {...register(`lineas.${i}.cantidad`)}
                        className="form-input h-8 text-xs" placeholder="0" />
                    </td>
                    <td>
                      <input type="number" step="0.01"
                        {...register(`lineas.${i}.precio_unit`)}
                        className="form-input h-8 text-xs" placeholder="0.00" />
                    </td>
                    <td className="font-semibold text-xs">
                      ${sub.toLocaleString('en', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <input type="text"
                        {...register(`lineas.${i}.nota`)}
                        className="form-input h-8 text-xs" placeholder="Nota opcional..." />
                    </td>
                    <td>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(i)}
                          className="text-mist hover:text-rs transition-colors text-base leading-none">
                          ×
                        </button>
                      )}
                    </td>
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
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        {errors.lineas?.message && (
          <div className="px-4 py-2 text-xs text-rs">{errors.lineas.message}</div>
        )}
      </div>

      {error && (
        <div className="bg-rs-l text-rs text-xs px-4 py-3 rounded-lg border border-rs/20">
          {error?.error?.message || 'Error al crear el pedido'}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/pedidos')}>
          ← Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Creando...' : '✓ Crear pedido'}
        </button>
      </div>
    </form>
  )
}