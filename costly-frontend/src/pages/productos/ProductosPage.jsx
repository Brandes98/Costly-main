import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import { useProductos, useCreateProducto, useUpdateProducto, useDeleteProducto } from '../../hooks/useApi';
import { Modal, Confirm } from '../../components/ui/Spinner';
import Button, { IconButton } from '../../components/ui/Button';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { permisoTipoLabel } from '../../lib/utils';
import { useQueryClient } from '@tanstack/react-query'  // ← ya lo tenés? si no agregar
import api from '../../lib/api'                          // ← agregar

const schema = z.object({
  sku: z.string().min(1, 'Requerido').max(50),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  descripcion: z.string().optional().or(z.literal('')),
  categoria: z.string().max(80).optional().or(z.literal('')),
  cod_arancelario: z.string().max(20).optional().or(z.literal('')),
  arancel_pct: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  peso_kg: z.coerce.number().positive().optional().or(z.literal('')),
  modo_volumen: z.enum(['unitario', 'por_caja', 'sin_volumen']).default('unitario'),
  largo_cm:   z.coerce.number().positive().optional().or(z.literal('')),
  ancho_cm:   z.coerce.number().positive().optional().or(z.literal('')),
  alto_cm:    z.coerce.number().positive().optional().or(z.literal('')),
  volumen_m3: z.coerce.number().positive().optional().or(z.literal('')),
  unidades_por_caja: z.coerce.number().int().positive().optional().or(z.literal('')),
  peso_caja_kg:      z.coerce.number().positive().optional().or(z.literal('')),
  largo_caja_cm:     z.coerce.number().positive().optional().or(z.literal('')),
  ancho_caja_cm:     z.coerce.number().positive().optional().or(z.literal('')),
  alto_caja_cm:      z.coerce.number().positive().optional().or(z.literal('')),
  volumen_caja_m3:   z.coerce.number().positive().optional().or(z.literal('')),
  requiere_permiso: z.boolean().optional(),
  permiso_tipo: z.string().max(80).optional().or(z.literal('')),
});

const MODO_VOLUMEN = [
  { value: 'unitario', label: 'Unitario', pill: 'pill-blue' },
  { value: 'por_caja', label: 'Por caja', pill: 'pill-yellow' },
  { value: 'sin_volumen', label: 'Sin volumen', pill: 'pill-gray' },
];

const PERMISO_TIPOS = ['minae', 'senasa', 'minsa', 'sutel', 'otro'];

const modoLabel = (modo) => MODO_VOLUMEN.find((m) => m.value === modo)?.label || modo;
const modoPillClass = (modo) => MODO_VOLUMEN.find((m) => m.value === modo)?.pill || 'pill-gray';

export default function ProductosPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const isAdmin = usuario?.rol === 'admin';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const { data: productos = [], isLoading } = useProductos();
  const { mutate: crear, isPending: creando } = useCreateProducto();
  const { mutate: editar, isPending: editando_ } = useUpdateProducto();
  const { mutate: eliminar } = useDeleteProducto();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { modo_volumen: 'unitario', requiere_permiso: false },
  });

  const modoVolumen  = useWatch({ control, name: 'modo_volumen' });
  const largoCm      = useWatch({ control, name: 'largo_cm' });
  const anchoCm      = useWatch({ control, name: 'ancho_cm' });
  const altoCm       = useWatch({ control, name: 'alto_cm' });
  const largoCajaCm  = useWatch({ control, name: 'largo_caja_cm' })
const anchoCajaCm  = useWatch({ control, name: 'ancho_caja_cm' })
const altoCajaCm   = useWatch({ control, name: 'alto_caja_cm' })

  const volumenCajaCalculado = (largoCajaCm && anchoCajaCm && altoCajaCm)
    ? ((Number(largoCajaCm) * Number(anchoCajaCm) * Number(altoCajaCm)) / 1_000_000).toFixed(6)
    : null
  const volumenCalculado = (largoCm && anchoCm && altoCm)
    ? ((Number(largoCm) * Number(anchoCm) * Number(altoCm)) / 1_000_000).toFixed(6)
    : null
  const requierePermiso = useWatch({ control, name: 'requiere_permiso' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.sku?.toLowerCase().includes(q) ||
        p.nombre?.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q),
    );
  }, [productos, search]);

  const abrirCrear = () => {
    setEditando(null);
    reset({ modo_volumen: 'unitario', requiere_permiso: false });
    setModalOpen(true);
  };

  const abrirEditar = (p) => {
    setEditando(p);
    reset({
      sku: p.sku,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria: p.categoria || '',
      cod_arancelario: p.cod_arancelario || '',
      arancel_pct: p.arancel_pct ?? '',
      peso_kg: p.peso_kg ?? '',
      modo_volumen: p.modo_volumen || 'unitario',
      largo_cm:   p.largo_cm ?? '',
      ancho_cm:   p.ancho_cm ?? '',
      alto_cm:    p.alto_cm  ?? '',
      volumen_m3: p.volumen_m3 ?? '',
      unidades_por_caja: p.unidades_por_caja ?? '',
      peso_caja_kg:      p.peso_caja_kg ?? '',
      largo_caja_cm:     p.largo_caja_cm ?? '',
      ancho_caja_cm:     p.ancho_caja_cm ?? '',
      alto_caja_cm:      p.alto_caja_cm  ?? '',
      volumen_caja_m3:   p.volumen_caja_m3 ?? '',
      requiere_permiso: p.requiere_permiso || false,
      permiso_tipo: p.permiso_tipo || '',
    });
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    reset();
  };

  const onSubmit = (data) => {
    const payload = {
      sku: data.sku,
      nombre: data.nombre,
      descripcion: data.descripcion || undefined,
      categoria: data.categoria || undefined,
      cod_arancelario: data.cod_arancelario || undefined,
      arancel_pct: data.arancel_pct === '' ? undefined : Number(data.arancel_pct),
      peso_kg: data.peso_kg === '' ? undefined : Number(data.peso_kg),
      modo_volumen: data.modo_volumen,
      largo_cm:   data.largo_cm !== '' ? Number(data.largo_cm) : undefined,
      ancho_cm:   data.ancho_cm !== '' ? Number(data.ancho_cm) : undefined,
      alto_cm:    data.alto_cm  !== '' ? Number(data.alto_cm)  : undefined,
      volumen_m3: data.modo_volumen === 'unitario'
        ? (volumenCalculado ? Number(volumenCalculado) : (data.volumen_m3 !== '' ? Number(data.volumen_m3) : undefined))
        : undefined,
      unidades_por_caja: data.modo_volumen === 'por_caja' && data.unidades_por_caja !== '' ? Number(data.unidades_por_caja) : undefined,
      peso_caja_kg:      data.modo_volumen === 'por_caja' && data.peso_caja_kg !== '' ? Number(data.peso_caja_kg) : undefined,
      largo_caja_cm:     data.modo_volumen === 'por_caja' && data.largo_caja_cm !== '' ? Number(data.largo_caja_cm) : undefined,
      ancho_caja_cm:     data.modo_volumen === 'por_caja' && data.ancho_caja_cm !== '' ? Number(data.ancho_caja_cm) : undefined,
      alto_caja_cm:      data.modo_volumen === 'por_caja' && data.alto_caja_cm  !== '' ? Number(data.alto_caja_cm)  : undefined,
      volumen_caja_m3: data.modo_volumen === 'por_caja'
  ? (volumenCajaCalculado ? Number(volumenCajaCalculado) : (data.volumen_caja_m3 !== '' ? Number(data.volumen_caja_m3) : undefined))
  : undefined,
      requiere_permiso: data.requiere_permiso || false,
      permiso_tipo: data.requiere_permiso ? (data.permiso_tipo || undefined) : undefined,
    };

    if (editando) {
      editar({ id: editando.producto_id, ...payload }, { onSuccess: cerrarModal });
    } else {
      crear(payload, { onSuccess: cerrarModal });
    }
  };

  return (
 <div className="space-y-3">
  <div className="flex items-center gap-2">
    <div className="flex-1">
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar SKU o nombre..."
        createLabel="Nuevo producto"
        onCreate={abrirCrear}
      />
    </div>
  <button
  className="btn btn-outline text-xs shrink-0"
  onClick={async () => {
    try {
      const res = await api.get('/import/plantilla/productos', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_productos.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al descargar plantilla')
    }
  }}
>
  📥 Plantilla Excel
</button>
    <label className="btn btn-outline text-xs cursor-pointer shrink-0">
      📊 Importar Excel
      <input
        type="file"
        className="hidden"
        accept=".xlsx,.xls"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const formData = new FormData()
          formData.append('archivo', file)
          try {
            const res = await api.post('/import/productos', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
            alert(`✅ ${res.creados} productos importados${res.errores?.length ? `\n⚠️ ${res.errores.length} errores` : ''}`)
            qc.invalidateQueries({ queryKey: ['productos'] })
          } catch (e) {
            alert('Error al importar: ' + (e?.message || 'Intentá de nuevo'))
          }
          e.target.value = ''
        }}
      />
    </label>
  </div>
    

      <TableCard
        title="📦 Catálogo de productos"
        countLabel={`${filtered.length} productos`}
        loading={isLoading}
        isEmpty={filtered.length === 0}
        emptyMessage="No hay productos que mostrar"
      >
        <TableContainer>
          <thead>
            <tr>
              <th>Codigo de Producto</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Arancel</th>
              <th>Modo volumen</th>
              <th>Permiso</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.producto_id}>
                <td>
                  <code className="text-xs bg-sur2 px-1.5 py-0.5 rounded">{p.sku}</code>
                </td>
                <td>
                  <div className="text-xs font-medium">{p.nombre}</div>
                  {p.descripcion && (
                    <div className="text-[10px] text-mist">{p.descripcion}</div>
                  )}
                </td>
                <td className="text-xs text-mist">{p.categoria || '—'}</td>
                <td className="text-xs text-mist">
                  {p.arancel_pct != null ? `${p.arancel_pct}%` : '—'}
                </td>
                <td>
                  <span className={`pill ${modoPillClass(p.modo_volumen)}`}>
                    {modoLabel(p.modo_volumen)}
                  </span>
                </td>
                <td>
                  {p.requiere_permiso ? (
                    <span className="pill pill-yellow">{permisoTipoLabel(p.permiso_tipo)}</span>
                  ) : (
                    <span className="text-xs text-mist">—</span>
                  )}
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <IconButton variant="edit" onClick={() => abrirEditar(p)} title="Editar" />
                    {isAdmin && (
                      <IconButton variant="delete" onClick={() => setConfirmDel(p)} title="Desactivar" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      <Modal
        open={modalOpen}
        onClose={cerrarModal}
        title={editando ? `Editar — ${editando.nombre}` : 'Nuevo producto'}
        footer={
          <>
            <button className="btn btn-outline" onClick={cerrarModal}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={creando || editando_}
            >
              {creando || editando_ ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Datos básicos */}
          <div>
            <div className="text-[10px] font-semibold text-mist uppercase tracking-wider mb-2">
              Datos básicos
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Codigo de Producto *</label>
                <input {...register('sku')} className="form-input" placeholder="Ej: MTR-HX200" />
                {errors.sku && <span className="text-xs text-rs">{errors.sku.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <input {...register('categoria')} className="form-input" placeholder="Ej: Motores" />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Nombre *</label>
                <input {...register('nombre')} className="form-input" placeholder="Nombre del producto" />
                {errors.nombre && <span className="text-xs text-rs">{errors.nombre.message}</span>}
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Descripción</label>
                <input {...register('descripcion')} className="form-input" placeholder="Descripción opcional" />
              </div>
              <div className="form-group">
                <label className="form-label">Cód. arancelario</label>
                <input {...register('cod_arancelario')} className="form-input" placeholder="8501.10.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Arancel %</label>
                <input {...register('arancel_pct')} className="form-input" type="number" placeholder="0" min="0" max="100" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Peso kg</label>
                <input {...register('peso_kg')} className="form-input" type="number" placeholder="0.000" min="0" step="0.001" />
              </div>
            </div>
          </div>

          {/* Volumen y empaque */}
          <div className="border-t border-border pt-4">
            <div className="text-[10px] font-semibold text-mist uppercase tracking-wider mb-2">
              Volumen y empaque
            </div>
            <div className="space-y-3">
              <div className="form-group">
                <label className="form-label">Modo de volumen *</label>
                <select {...register('modo_volumen')} className="form-input">
                  {MODO_VOLUMEN.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              {modoVolumen === 'unitario' && (
                <div className="space-y-3">
                  <div className="rounded-card border border-border bg-sur2 p-3 space-y-2">
                    <div className="text-[10px] font-semibold text-mist uppercase tracking-wider">
                      Medidas (calcula volumen automáticamente)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="form-group">
                        <label className="form-label">Largo (cm)</label>
                        <input {...register('largo_cm')} className="form-input" type="number" placeholder="0" min="0" step="0.01" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ancho (cm)</label>
                        <input {...register('ancho_cm')} className="form-input" type="number" placeholder="0" min="0" step="0.01" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alto (cm)</label>
                        <input {...register('alto_cm')} className="form-input" type="number" placeholder="0" min="0" step="0.01" />
                      </div>
                    </div>
                    {volumenCalculado && (
                      <div className="rounded border border-tl/20 bg-tl-xl px-3 py-1.5 text-xs text-tl flex justify-between">
                        <span>✓ Volumen calculado automáticamente</span>
                        <span className="font-bold">{volumenCalculado} m³</span>
                      </div>
                    )}
                  </div>
                  {!volumenCalculado && (
                    <div className="form-group">
                      <label className="form-label">Volumen m³ (manual)</label>
                      <input {...register('volumen_m3')} className="form-input" type="number" placeholder="0.000000" min="0" step="0.000001" />
                      <div className="text-[10px] text-mist mt-1">Ingresá las medidas arriba para calcular automáticamente, o el volumen directamente acá.</div>
                    </div>
                  )}
                </div>
              )}
              {modoVolumen === 'por_caja' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Unidades por caja</label>
                      <input {...register('unidades_por_caja')} className="form-input" type="number" placeholder="0" min="1" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Peso caja (kg)</label>
                      <input {...register('peso_caja_kg')} className="form-input" type="number" placeholder="0.000" min="0" step="0.001" />
                    </div>
                  </div>
                  <div className="rounded-card border border-border bg-sur2 p-3 space-y-2">
                    <div className="text-[10px] font-semibold text-mist uppercase tracking-wider">
                      Medidas de la caja (calcula volumen automáticamente)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="form-group">
                        <label className="form-label">Largo (cm)</label>
                        <input {...register('largo_caja_cm')} className="form-input" type="number" placeholder="0" min="0" step="0.01" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ancho (cm)</label>
                        <input {...register('ancho_caja_cm')} className="form-input" type="number" placeholder="0" min="0" step="0.01" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alto (cm)</label>
                        <input {...register('alto_caja_cm')} className="form-input" type="number" placeholder="0" min="0" step="0.01" />
                      </div>
                      {volumenCajaCalculado && (
                      <div className="rounded border border-tl/20 bg-tl-xl px-3 py-1.5 text-xs text-tl flex justify-between">
                       <span>✓ Volumen calculado automáticamente</span>
                        <span className="font-bold">{volumenCajaCalculado} m³</span>
                          </div>
                           )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Volumen caja m³ (manual)</label>
                    <input {...register('volumen_caja_m3')} className="form-input" type="number" placeholder="0.000000" min="0" step="0.000001" />
                    <div className="text-[10px] text-mist mt-1">Ingresá las medidas arriba o el volumen directamente.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Permisos especiales */}
          <div className="border-t border-border pt-4">
            <div className="text-[10px] font-semibold text-mist uppercase tracking-wider mb-2">
              Permisos especiales
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input {...register('requiere_permiso')} type="checkbox" className="rounded" />
                <span className="text-xs text-ink">Requiere permiso de importación</span>
              </label>
              {requierePermiso && (
                <div className="form-group">
                  <label className="form-label">Tipo de permiso</label>
                  <select {...register('permiso_tipo')} className="form-input">
                    <option value="">Seleccionar...</option>
                    {PERMISO_TIPOS.map((t) => (
                      <option key={t} value={t}>{permisoTipoLabel(t)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => eliminar(confirmDel.producto_id)}
        title="Desactivar producto"
        message={`¿Seguro que querés desactivar "${confirmDel?.nombre}"? No se borrará, solo quedará inactivo.`}
        danger
      />
    </div>
  );
}
