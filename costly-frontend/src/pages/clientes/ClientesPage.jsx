import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import { Modal, Confirm } from '../../components/ui/Spinner';

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  cedula: z.string().max(20).optional().or(z.literal('')),
  tipo: z.enum(['nacional', 'exportacion', 'interno'], { message: 'Requerido' }),
  moneda: z.string().length(3, 'Requerido'),
  descuento_pct: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

const TIPOS = [
  { value: 'nacional', label: 'Nacional', pill: 'pill-blue' },
  { value: 'exportacion', label: 'Exportación', pill: 'pill-violet' },
  { value: 'interno', label: 'Interno', pill: 'pill-gray' },
];

const MONEDAS = ['CRC', 'USD', 'EUR'];

const tipoLabel = (tipo) => TIPOS.find((t) => t.value === tipo)?.label || tipo;
const tipoPillClass = (tipo) => TIPOS.find((t) => t.value === tipo)?.pill || 'pill-gray';

export default function ClientesPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const isAdmin = usuario?.rol === 'admin';

  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const filters = useMemo(() => (tipo ? { tipo } : {}), [tipo]);
  const { data: clientes = [], isLoading } = useClientes(filters);

  const { mutate: crear, isPending: creando } = useCreateCliente();
  const { mutate: editar, isPending: editando_ } = useUpdateCliente();
  const { mutate: eliminar, isPending: eliminando } = useDeleteCliente();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'nacional', moneda: 'CRC' },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const nombre = c.nombre?.toLowerCase() || '';
      const cedula = c.cedula?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      return nombre.includes(q) || cedula.includes(q) || email.includes(q);
    });
  }, [clientes, search]);

  const abrirCrear = () => {
    setEditando(null);
    reset({ nombre: '', cedula: '', tipo: 'nacional', moneda: 'CRC', descuento_pct: '', email: '' });
    setModalOpen(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    reset({
      nombre: c.nombre,
      cedula: c.cedula || '',
      tipo: c.tipo,
      moneda: c.moneda,
      descuento_pct: c.descuento_pct ?? '',
      email: c.email || '',
    });
    setModalOpen(true);
  };

  const onSubmit = (data) => {
    const payload = {
      nombre: data.nombre,
      cedula: data.cedula || undefined,
      tipo: data.tipo,
      moneda: data.moneda,
      descuento_pct: data.descuento_pct === '' ? undefined : Number(data.descuento_pct),
      email: data.email || undefined,
    };

    if (editando) {
      editar(
        { id: editando.cliente_id, ...payload },
        {
          onSuccess: () => {
            setModalOpen(false);
            reset();
          },
        },
      );
    } else {
      crear(payload, {
        onSuccess: () => {
          setModalOpen(false);
          reset();
        },
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 h-8 px-3 text-xs text-mist border border-border rounded-lg bg-sur2 w-56">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-mist"
            />
          </div>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="h-8 px-3 text-xs border border-border rounded-lg bg-sur2 text-ink"
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary text-xs" onClick={abrirCrear}>
          ＋ Nuevo cliente
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">🧑‍💼 Clientes</div>
          <span className="text-[11.5px] text-mist">{filtered.length} registros</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🧑‍💼</div>
            <div className="text-sm font-medium text-ink mb-1">Sin clientes</div>
            <div className="text-xs text-mist mb-4">Agregá tu primer cliente para empezar</div>
            <button className="btn btn-primary text-xs" onClick={abrirCrear}>
              ＋ Crear cliente
            </button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cédula/RUC</th>
                <th>Tipo</th>
                <th>Moneda</th>
                <th>Descuento</th>
                <th>Email</th>
                <th>Estado</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.cliente_id}>
                  <td>
                    <div className="font-medium text-xs">{c.nombre}</div>
                  </td>
                  <td className="text-xs text-mist">{c.cedula || '—'}</td>
                  <td>
                    <span className={`pill ${tipoPillClass(c.tipo)}`}>{tipoLabel(c.tipo)}</span>
                  </td>
                  <td className="font-medium text-xs">{c.moneda}</td>
                  <td className="text-xs text-mist">
                    {c.descuento_pct != null ? `${Number(c.descuento_pct).toFixed(2)}%` : '—'}
                  </td>
                  <td className="text-xs">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-tl hover:underline">
                        {c.email}
                      </a>
                    ) : (
                      <span className="text-mist">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${c.activo ? 'pill-green' : 'pill-red'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button
                        className="btn btn-outline text-xs px-2 py-1"
                        onClick={() => abrirEditar(c)}
                      >
                        ✏️
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-outline text-xs px-2 py-1 hover:border-rs hover:text-rs"
                          onClick={() => setConfirmDel(c)}
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

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
        }}
        title={editando ? `Editar — ${editando.nombre}` : 'Nuevo cliente'}
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setModalOpen(false);
                reset();
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={creando || editando_}>
              {creando || editando_ ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group col-span-2">
            <label className="form-label">Nombre / Razón social *</label>
            <input {...register('nombre')} className="form-input" placeholder="Ej: Distribuidora XYZ S.A." />
            {errors.nombre && <span className="text-xs text-rs">{errors.nombre.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Cédula / RUC</label>
            <input {...register('cedula')} className="form-input" placeholder="3-101-123456" />
            {errors.cedula && <span className="text-xs text-rs">{errors.cedula.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <select {...register('tipo')} className="form-input">
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.tipo && <span className="text-xs text-rs">{errors.tipo.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Moneda preferida *</label>
            <select {...register('moneda')} className="form-input">
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.moneda && <span className="text-xs text-rs">{errors.moneda.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Descuento %</label>
            <input {...register('descuento_pct')} className="form-input" placeholder="0" type="number" step="0.01" min="0" max="100" />
            {errors.descuento_pct && <span className="text-xs text-rs">{errors.descuento_pct.message}</span>}
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Email de contacto</label>
            <input {...register('email')} className="form-input" placeholder="contacto@empresa.com" type="email" />
            {errors.email && <span className="text-xs text-rs">{errors.email.message}</span>}
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => eliminar(confirmDel.cliente_id)}
        title="Desactivar cliente"
        message={`¿Seguro que querés desactivar a "${confirmDel?.nombre}"? No se borrará, solo quedará inactivo.`}
        danger
      />

      {eliminando && (
        <div className="fixed bottom-4 right-4 bg-sur border border-border rounded-lg px-3 py-2 text-xs text-mist shadow-sh2">
          Desactivando...
        </div>
      )}
    </div>
  );
}

