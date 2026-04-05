import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../store/auth.store'
import {
  useProductos,
  useCreateProducto,
  useUpdateProducto,
  useDeleteProducto,
} from '../../hooks/useApi'
import Spinner from '../../components/ui/Spinner'
import { Modal, Confirm } from '../../components/ui/Spinner'

const emptyToUndefined = (value) => (value === '' || value == null ? undefined : value)
const numberOrUndefined = (value) => {
  if (value === '' || value == null) return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

const schema = z
  .object({
    sku: z.string().min(1, 'Requerido').max(50),
    categoria: z.string().max(80).optional().or(z.literal('')),
    nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),

    cod_arancelario: z.string().max(20).optional().or(z.literal('')),
    arancel_pct: z.preprocess(numberOrUndefined, z.number().min(0).max(100).optional()),
    peso_kg: z.preprocess(numberOrUndefined, z.number().positive().optional()),

    modo_volumen: z.enum(['unitario', 'por_caja', 'sin_volumen']),
    volumen_m3: z.preprocess(numberOrUndefined, z.number().positive().optional()),
    unidades_por_caja: z.preprocess(numberOrUndefined, z.number().int().positive().optional()),
    volumen_caja_m3: z.preprocess(numberOrUndefined, z.number().positive().optional()),

    requiere_permiso: z.boolean().default(false),
    permiso_tipo: z.string().max(80).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.modo_volumen === 'unitario' && !data.volumen_m3) {
      ctx.addIssue({
        code: 'custom',
        path: ['volumen_m3'],
        message: 'Requerido en modo unitario',
      })
    }
    if (data.modo_volumen === 'por_caja') {
      if (!data.unidades_por_caja) {
        ctx.addIssue({
          code: 'custom',
          path: ['unidades_por_caja'],
          message: 'Requerido en modo por caja',
        })
      }
      if (!data.volumen_caja_m3) {
        ctx.addIssue({
          code: 'custom',
          path: ['volumen_caja_m3'],
          message: 'Requerido en modo por caja',
        })
      }
    }
    if (data.requiere_permiso && !data.permiso_tipo) {
      ctx.addIssue({
        code: 'custom',
        path: ['permiso_tipo'],
        message: 'Seleccioná el tipo de permiso',
      })
    }
  })

const MODO_LABEL = {
  unitario: 'Unitario',
  por_caja: 'Por caja',
  sin_volumen: 'Sin volumen',
}

const MODO_PILL = {
  unitario: 'pill-blue',
  por_caja: 'pill-yellow',
  sin_volumen: 'pill-gray',
}

const PERMISOS = ['MINAE', 'SENASA', 'MINSA', 'SUTEL', 'Otro']

export default function ProductosPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const isAdmin = usuario?.rol === 'admin'

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [error, setError] = useState(null)

  const { data: productos = [], isLoading } = useProductos()
  const { mutate: crear, isPending: creando } = useCreateProducto()
  const { mutate: editar, isPending: editandoPend } = useUpdateProducto()
  const { mutate: eliminar, isPending: eliminando } = useDeleteProducto()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      modo_volumen: 'unitario',
      requiere_permiso: false,
    },
  })

  const modoVol = watch('modo_volumen')
  const requierePermiso = watch('requiere_permiso')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => {
      const sku = p.sku?.toLowerCase() || ''
      const nombre = p.nombre?.toLowerCase() || ''
      return sku.includes(q) || nombre.includes(q)
    })
  }, [productos, search])

  const abrirCrear = () => {
    setError(null)
    setEditando(null)
    reset({
      sku: '',
      categoria: '',
      nombre: '',
      cod_arancelario: '',
      arancel_pct: '',
      peso_kg: '',
      modo_volumen: 'unitario',
      volumen_m3: '',
      unidades_por_caja: '',
      volumen_caja_m3: '',
      requiere_permiso: false,
      permiso_tipo: '',
    })
    setModalOpen(true)
  }

  const abrirEditar = (p) => {
    setError(null)
    setEditando(p)
    reset({
      sku: p.sku,
      categoria: p.categoria || '',
      nombre: p.nombre,
      cod_arancelario: p.cod_arancelario || '',
      arancel_pct: p.arancel_pct ?? '',
      peso_kg: p.peso_kg ?? '',
      modo_volumen: p.modo_volumen || 'unitario',
      volumen_m3: p.volumen_m3 ?? '',
      unidades_por_caja: p.unidades_por_caja ?? '',
      volumen_caja_m3: p.volumen_caja_m3 ?? '',
      requiere_permiso: !!p.requiere_permiso,
      permiso_tipo: p.permiso_tipo || '',
    })
    setModalOpen(true)
  }

  const onSubmit = (data) => {
    setError(null)

    const payload = {
      sku: data.sku,
      nombre: data.nombre,
      categoria: emptyToUndefined(data.categoria),
      cod_arancelario: emptyToUndefined(data.cod_arancelario),
      arancel_pct: data.arancel_pct,
      peso_kg: data.peso_kg,
      modo_volumen: data.modo_volumen,
      volumen_m3: data.modo_volumen === 'unitario' ? data.volumen_m3 : undefined,
      unidades_por_caja: data.modo_volumen === 'por_caja' ? data.unidades_por_caja : undefined,
      volumen_caja_m3: data.modo_volumen === 'por_caja' ? data.volumen_caja_m3 : undefined,
      requiere_permiso: !!data.requiere_permiso,
      permiso_tipo: data.requiere_permiso ? emptyToUndefined(data.permiso_tipo) : undefined,
    }

    const opts = {
      onSuccess: () => {
        setModalOpen(false)
        reset()
      },
      onError: (err) => setError(err?.error?.message || 'No se pudo guardar'),
    }

    if (editando) editar({ id: editando.producto_id, ...payload }, opts)
    else crear(payload, opts)
  }

  const onChangeModo = (value) => {
    setValue('modo_volumen', value, { shouldDirty: true, shouldValidate: true })
    if (value !== 'unitario') setValue('volumen_m3', '', { shouldDirty: true })
    if (value !== 'por_caja') {
      setValue('unidades_por_caja', '', { shouldDirty: true })
      setValue('volumen_caja_m3', '', { shouldDirty: true })
    }
  }

  const onTogglePermiso = (checked) => {
    setValue('requiere_permiso', checked, { shouldDirty: true, shouldValidate: true })
    if (!checked) setValue('permiso_tipo', '', { shouldDirty: true })
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 h-8 px-3 text-xs text-mist border border-border rounded-lg bg-sur2 w-56">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar SKU o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-mist"
            />
          </div>
        </div>
        <button className="btn btn-primary text-xs" onClick={abrirCrear}>
          ＋ Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📦 Catálogo de productos</div>
          <span className="text-[11.5px] text-mist">{filtered.length} registros</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-sm font-medium text-ink mb-1">Sin productos</div>
            <div className="text-xs text-mist mb-4">Agregá tu primer producto para empezar</div>
            <button className="btn btn-primary text-xs" onClick={abrirCrear}>
              ＋ Crear producto
            </button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Arancel</th>
                <th>Modo volumen</th>
                <th>Permiso</th>
                <th>Estado</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.producto_id}>
                  <td className="font-mono text-xs">
                    <code>{p.sku}</code>
                  </td>
                  <td>
                    <div className="font-medium text-xs">{p.nombre}</div>
                    {p.requiere_permiso && p.permiso_tipo && (
                      <div className="text-[10px] text-yellow-700">⚠ {p.permiso_tipo} requerido</div>
                    )}
                  </td>
                  <td className="text-xs text-mist">{p.categoria || '—'}</td>
                  <td className="text-xs">
                    {p.arancel_pct != null ? `${Number(p.arancel_pct).toFixed(2)}%` : '—'}
                  </td>
                  <td>
                    <span className={`pill ${MODO_PILL[p.modo_volumen || 'unitario']}`}>
                      {MODO_LABEL[p.modo_volumen || 'unitario']}
                    </span>
                  </td>
                  <td className="text-xs">
                    {p.requiere_permiso ? (
                      <span className="pill pill-yellow">{p.permiso_tipo || 'Permiso'}</span>
                    ) : (
                      <span className="text-mist">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${p.activo ? 'pill-green' : 'pill-red'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button
                        className="btn btn-outline text-xs px-2 py-1"
                        onClick={() => abrirEditar(p)}
                      >
                        ✏️
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-outline text-xs px-2 py-1 hover:border-rs hover:text-rs"
                          onClick={() => setConfirmDel(p)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setError(null)
          reset()
        }}
        title={editando ? `Editar — ${editando.nombre}` : 'Nuevo producto'}
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setModalOpen(false)
                setError(null)
                reset()
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={creando || editandoPend}
            >
              {creando || editandoPend ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </>
        }
      >
        {error && (
          <div className="bg-rs-l text-rs text-xs px-3 py-2 rounded-lg border border-rs/20 mb-3">
            {error}
          </div>
        )}

        <div className="text-[10px] font-semibold text-slate uppercase tracking-wider mb-2">
          Datos básicos
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="form-group">
            <label className="form-label">SKU *</label>
            <input {...register('sku')} className="form-input" placeholder="Ej: MTR-HX200" />
            {errors.sku && <span className="text-xs text-rs">{errors.sku.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <input {...register('categoria')} className="form-input" placeholder="Ej: Motores" />
          </div>
        </div>
        <div className="form-group mb-3">
          <label className="form-label">Nombre *</label>
          <input {...register('nombre')} className="form-input" placeholder="Nombre del producto" />
          {errors.nombre && <span className="text-xs text-rs">{errors.nombre.message}</span>}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="form-group">
            <label className="form-label">Cód. arancelario</label>
            <input {...register('cod_arancelario')} className="form-input" placeholder="8501.10.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Arancel %</label>
            <input {...register('arancel_pct')} className="form-input" type="number" step="0.01" placeholder="0" />
            {errors.arancel_pct && <span className="text-xs text-rs">{errors.arancel_pct.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Peso kg</label>
            <input {...register('peso_kg')} className="form-input" type="number" step="0.001" placeholder="0.000" />
            {errors.peso_kg && <span className="text-xs text-rs">{errors.peso_kg.message}</span>}
          </div>
        </div>

        <div className="text-[10px] font-semibold text-slate uppercase tracking-wider mb-2 pt-2 border-t border-border-lt">
          Volumen y empaque
        </div>
        <div className="form-group mb-3">
          <label className="form-label">Modo de volumen *</label>
          <select
            className="form-input"
            value={modoVol}
            onChange={(e) => onChangeModo(e.target.value)}
          >
            <option value="unitario">Unitario — volumen × cantidad</option>
            <option value="por_caja">Por caja — volumen caja × cajas</option>
            <option value="sin_volumen">Sin volumen — solo peso</option>
          </select>
        </div>

        {modoVol === 'unitario' && (
          <div className="form-group mb-3">
            <label className="form-label">Volumen m³ *</label>
            <input {...register('volumen_m3')} className="form-input" type="number" step="0.0001" placeholder="0.0000" />
            {errors.volumen_m3 && <span className="text-xs text-rs">{errors.volumen_m3.message}</span>}
          </div>
        )}

        {modoVol === 'por_caja' && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="form-group">
              <label className="form-label">Unidades por caja *</label>
              <input {...register('unidades_por_caja')} className="form-input" type="number" placeholder="0" />
              {errors.unidades_por_caja && (
                <span className="text-xs text-rs">{errors.unidades_por_caja.message}</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Volumen caja m³ *</label>
              <input {...register('volumen_caja_m3')} className="form-input" type="number" step="0.0001" placeholder="0.0000" />
              {errors.volumen_caja_m3 && (
                <span className="text-xs text-rs">{errors.volumen_caja_m3.message}</span>
              )}
            </div>
          </div>
        )}

        <div className="text-[10px] font-semibold text-slate uppercase tracking-wider mb-2 pt-2 border-t border-border-lt">
          Permisos especiales
        </div>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="checkbox"
            checked={!!requierePermiso}
            onChange={(e) => onTogglePermiso(e.target.checked)}
          />
          <span className="text-xs text-ink">Requiere permiso de importación</span>
        </div>

        {requierePermiso && (
          <div className="form-group">
            <label className="form-label">Tipo de permiso</label>
            <select {...register('permiso_tipo')} className="form-input">
              <option value="">Seleccionar...</option>
              {PERMISOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.permiso_tipo && <span className="text-xs text-rs">{errors.permiso_tipo.message}</span>}
          </div>
        )}
      </Modal>

      {/* Confirmar eliminar */}
      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => eliminar(confirmDel.producto_id)}
        title="Desactivar producto"
        message={`¿Seguro que querés desactivar "${confirmDel?.nombre}"? No se borrará, solo quedará inactivo.`}
        danger
      />

      {eliminando && (
        <div className="fixed bottom-4 right-4 bg-sur border border-border rounded-lg px-3 py-2 text-xs text-mist shadow-sh2">
          Desactivando...
        </div>
      )}
    </div>
  )
}

