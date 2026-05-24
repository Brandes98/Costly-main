import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import {
  useClientes,
  useCreateCliente,
  useUpdateCliente,
  useDeleteCliente,
} from '../../hooks/useApi';
import { Modal, Confirm } from '../../components/ui/Spinner';
import ImportarExcelModal from '../../components/ui/ImportarExcelModal';
import Button, { IconButton } from '../../components/ui/Button';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';

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
  const [modalImport, setModalImport] = useState(false);
  const [tipo, setTipo] = useState('');
  const [showInactivos, setShowInactivos] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const filters = {
    ...(tipo && { tipo }),
    ...(!showInactivos && { activo: 'true' }),
  };
  const { data: clientes = [], isLoading } = useClientes(filters);

  const { mutate: crear, isPending: creando } = useCreateCliente();
  const { mutate: editar, isPending: editando_ } = useUpdateCliente();
  const { mutate: eliminar } = useDeleteCliente();

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
    reset({
      nombre: '',
      cedula: '',
      tipo: 'nacional',
      moneda: 'CRC',
      descuento_pct: '',
      email: '',
    });
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
      {/* Toolbar */}
      <div className="flex justify-end mb-1">
        <button className="btn btn-outline text-xs" onClick={() => setModalImport(true)}>📥 Importar Excel</button>
      </div>
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar cliente..."
        filters={[
          { value: tipo, onChange: setTipo, options: TIPOS, placeholder: 'Todos los tipos' },
        ]}
        switches={[
          { label: 'Ver inactivos', value: showInactivos, onChange: setShowInactivos },
        ]}
        createLabel="Nuevo cliente"
        onCreate={abrirCrear}
      />

      {/* Tabla */}
      <TableCard
        title="🧑‍💼 Clientes"
        countLabel={`${filtered.length} registros`}
        loading={isLoading}
        isEmpty={filtered.length === 0}
        emptyMessage="No hay clientes que mostrar"
      >
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-3 text-4xl">🧑‍💼</div>
            <div className="mb-1 text-sm font-medium text-ink">Sin clientes</div>
            <div className="mb-4 text-xs text-mist">Agregá tu primer cliente para empezar</div>
            <Button icon="create" onClick={abrirCrear}>
              Crear cliente
            </Button>
          </div>
        ) : (
          <TableContainer>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cédula / RUC</th>
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
                    <div className="text-xs font-medium">{c.nombre}</div>
                  </td>
                  <td className="text-xs text-mist">{c.cedula || '—'}</td>
                  <td>
                    <span className={`pill ${tipoPillClass(c.tipo)}`}>{tipoLabel(c.tipo)}</span>
                  </td>
                  <td className="text-xs font-medium">{c.moneda}</td>
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
                    <span className={`pill ${c.activo ? 'pill-green' : 'pill-gray'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <IconButton variant="edit" onClick={() => abrirEditar(c)} title="Editar" />
                      {isAdmin && (
                        <IconButton
                          variant="delete"
                          onClick={() => setConfirmDel(c)}
                          title="Desactivar"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableContainer>
        )}
      </TableCard>

      {/* Modal crear/editar */}
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
            <button
              className="btn btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={creando || editando_}
            >
              {creando || editando_
                ? 'Guardando...'
                : editando
                  ? 'Guardar cambios'
                  : 'Crear cliente'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group col-span-2">
            <label className="form-label">Nombre / Razón social *</label>
            <input
              {...register('nombre')}
              className="form-input"
              placeholder="Ej: Distribuidora XYZ S.A."
            />
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
            <input
              {...register('descuento_pct')}
              className="form-input"
              placeholder="0"
              type="number"
              step="0.01"
              min="0"
              max="100"
            />
            {errors.descuento_pct && (
              <span className="text-xs text-rs">{errors.descuento_pct.message}</span>
            )}
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Email de contacto</label>
            <input
              {...register('email')}
              className="form-input"
              placeholder="contacto@empresa.com"
              type="email"
            />
            {errors.email && <span className="text-xs text-rs">{errors.email.message}</span>}
          </div>
        </div>
      </Modal>

      {/* Confirmar desactivar */}
      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => eliminar(confirmDel.cliente_id)}
        title="Desactivar cliente"
        message={`¿Seguro que querés desactivar a "${confirmDel?.nombre}"? No se borrará, solo quedará inactivo.`}
        danger
      />
      {modalImport && (
        <ImportarExcelModal
          entidad="clientes"
          queryKey="clientes"
          onClose={() => setModalImport(false)}
        />
      )}
    </div>
  );
}
