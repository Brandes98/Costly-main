import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  useProveedores,
  useCreateProveedor,
  useUpdateProveedor,
  useDeleteProveedor,
} from '../../hooks/useApi';
import api from '../../lib/api';
import { Modal, Confirm } from '../../components/ui/Spinner';
import Button, { IconButton } from '../../components/ui/Button';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';

// Schema

const schema = z.object({
  pais_id: z.coerce.number().int().positive('Requerido'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  ciudad: z.string().max(100).optional().or(z.literal('')),
  incoterm_pref: z.enum(['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']).optional().or(z.literal('')),
  moneda: z.string().length(3, 'Requerido'),
  dias_transito: z.coerce.number().int().positive().optional().or(z.literal('')),
  puerto_origen: z.string().max(80).optional().or(z.literal('')),
  condiciones_pago: z.string().max(100).optional().or(z.literal('')),
  contacto: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR'];
const MONEDAS = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'];

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const { data: proveedores = [], isLoading } = useProveedores();
  useQuery({
    queryKey: ['paises'],
    queryFn: () =>
      api.get('/proveedores').then(() =>
        fetch('/api/v1/proveedores')
          .then((r) => r.json())
          .then(() => []),
      ),
    enabled: false,
  });

  const paisesComunes = [
    { pais_id: 1, nombre: 'Costa Rica', codigo: 'CR', bandera: '🇨🇷' },
    { pais_id: 44, nombre: 'China', codigo: 'CN', bandera: '🇨🇳' },
    { pais_id: 84, nombre: 'Estados Unidos', codigo: 'US', bandera: '🇺🇸' },
    { pais_id: 55, nombre: 'Alemania', codigo: 'DE', bandera: '🇩🇪' },
    { pais_id: 77, nombre: 'España', codigo: 'ES', bandera: '🇪🇸' },
    { pais_id: 66, nombre: 'México', codigo: 'MX', bandera: '🇲🇽' },
    { pais_id: 99, nombre: 'Japón', codigo: 'JP', bandera: '🇯🇵' },
  ];

  const { mutate: crear, isPending: creando } = useCreateProveedor();
  const { mutate: editar, isPending: editando_ } = useUpdateProveedor();
  const { mutate: eliminar, isPending: eliminando } = useDeleteProveedor();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { moneda: 'USD' },
  });

  const filtered = proveedores.filter(
    (proveedor) =>
      !search ||
      proveedor.nombre.toLowerCase().includes(search.toLowerCase()) ||
      proveedor.pais?.nombre?.toLowerCase().includes(search.toLowerCase()),
  );

  const abrirCrear = () => {
    setEditando(null);
    reset({ moneda: 'USD', pais_id: '' });
    setModalOpen(true);
  };

  const abrirEditar = (proveedor) => {
    setEditando(proveedor);
    reset({
      pais_id: proveedor.pais_id,
      nombre: proveedor.nombre,
      ciudad: proveedor.ciudad || '',
      incoterm_pref: proveedor.incoterm_pref || '',
      moneda: proveedor.moneda,
      dias_transito: proveedor.dias_transito || '',
      puerto_origen: proveedor.puerto_origen || '',
      condiciones_pago: proveedor.condiciones_pago || '',
      contacto: proveedor.contacto || '',
      email: proveedor.email || '',
    });
    setModalOpen(true);
  };

  const onSubmit = (data) => {
    const payload = {
      ...data,
      pais_id: Number(data.pais_id),
      dias_transito: data.dias_transito ? Number(data.dias_transito) : undefined,
      ciudad: data.ciudad || undefined,
      incoterm_pref: data.incoterm_pref || undefined,
      puerto_origen: data.puerto_origen || undefined,
      condiciones_pago: data.condiciones_pago || undefined,
      contacto: data.contacto || undefined,
      email: data.email || undefined,
    };

    if (editando) {
      editar(
        { id: editando.proveedor_id, ...payload },
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
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar proveedor..."
        action={
          <Button icon="create" onClick={abrirCrear}>
            Nuevo proveedor
          </Button>
        }
      />

      {/* Tabla */}
      <TableCard
        title="🏭 Proveedores"
        countLabel={`${filtered.length} registros`}
        loading={isLoading}
        isEmpty={filtered.length === 0}
        emptyMessage="No hay proveedores que mostrar"
      >
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-3 text-4xl">🏭</div>
            <div className="mb-1 text-sm font-medium text-ink">Sin proveedores</div>
            <div className="mb-4 text-xs text-mist">Agregá tu primer proveedor para empezar</div>
            <Button icon="create" onClick={abrirCrear}>
              Crear proveedor
            </Button>
          </div>
        ) : (
          <TableContainer>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>País</th>
                <th>Moneda</th>
                <th>Incoterm</th>
                <th>Tránsito</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((proveedor) => (
                <tr key={proveedor.proveedor_id}>
                  <td>
                    <div className="text-xs font-medium">{proveedor.nombre}</div>
                    {proveedor.ciudad && (
                      <div className="text-[10px] text-mist">{proveedor.ciudad}</div>
                    )}
                  </td>
                  <td>
                    <span className="ic">
                      {proveedor.pais?.bandera} {proveedor.pais?.nombre}
                    </span>
                  </td>
                  <td className="text-xs font-medium">{proveedor.moneda}</td>
                  <td>
                    {proveedor.incoterm_pref ? (
                      <span className="incb">{proveedor.incoterm_pref}</span>
                    ) : (
                      <span className="text-xs text-mist">—</span>
                    )}
                  </td>
                  <td className="text-xs text-mist">
                    {proveedor.dias_transito ? `${proveedor.dias_transito} días` : '—'}
                  </td>
                  <td className="text-xs">
                    {proveedor.email ? (
                      <a href={`mailto:${proveedor.email}`} className="text-tl hover:underline">
                        {proveedor.email}
                      </a>
                    ) : (
                      <span className="text-mist">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${proveedor.activo ? 'pill-green' : 'pill-red'}`}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <IconButton
                        variant="edit"
                        onClick={() => abrirEditar(proveedor)}
                        title="Editar"
                      />
                      <IconButton
                        variant="delete"
                        onClick={() => setConfirmDel(proveedor)}
                        title="Eliminar"
                      />
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
        title={editando ? `Editar — ${editando.nombre}` : 'Nuevo proveedor'}
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
                  : 'Crear proveedor'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {/* Nombre */}
          <div className="form-group col-span-2">
            <label className="form-label">Nombre / Razón social *</label>
            <input
              {...register('nombre')}
              className="form-input"
              placeholder="Ej: Shenzhen Tech Co."
            />
            {errors.nombre && <span className="text-xs text-rs">{errors.nombre.message}</span>}
          </div>

          {/* PaÃ­s */}
          <div className="form-group">
            <label className="form-label">País *</label>
            <select {...register('pais_id')} className="form-input">
              <option value="">Seleccionar...</option>
              {paisesComunes.map((pais) => (
                <option key={pais.pais_id} value={pais.pais_id}>
                  {pais.bandera} {pais.nombre}
                </option>
              ))}
            </select>
            {errors.pais_id && <span className="text-xs text-rs">{errors.pais_id.message}</span>}
          </div>

          {/* Ciudad */}
          <div className="form-group">
            <label className="form-label">Ciudad / Puerto</label>
            <input {...register('ciudad')} className="form-input" placeholder="Ej: Shenzhen" />
          </div>

          {/* Moneda */}
          <div className="form-group">
            <label className="form-label">Moneda habitual *</label>
            <select {...register('moneda')} className="form-input">
              {MONEDAS.map((moneda) => (
                <option key={moneda} value={moneda}>
                  {moneda}
                </option>
              ))}
            </select>
            {errors.moneda && <span className="text-xs text-rs">{errors.moneda.message}</span>}
          </div>

          {/* Incoterm */}
          <div className="form-group">
            <label className="form-label">Incoterm habitual</label>
            <select {...register('incoterm_pref')} className="form-input">
              <option value="">Sin preferencia</option>
              {INCOTERMS.map((incoterm) => (
                <option key={incoterm} value={incoterm}>
                  {incoterm}
                </option>
              ))}
            </select>
          </div>

          {/* DÃ­as trÃ¡nsito */}
          <div className="form-group">
            <label className="form-label">Días de tránsito</label>
            <input
              {...register('dias_transito')}
              type="number"
              className="form-input"
              placeholder="Ej: 35"
            />
          </div>

          {/* Puerto origen */}
          <div className="form-group">
            <label className="form-label">Puerto de salida habitual</label>
            <input
              {...register('puerto_origen')}
              className="form-input"
              placeholder="Ej: Shanghai"
            />
          </div>

          {/* Contacto */}
          <div className="form-group">
            <label className="form-label">Persona de contacto</label>
            <input
              {...register('contacto')}
              className="form-input"
              placeholder="Nombre del contacto"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              {...register('email')}
              type="email"
              className="form-input"
              placeholder="contact@proveedor.com"
            />
            {errors.email && <span className="text-xs text-rs">{errors.email.message}</span>}
          </div>

          {/* Condiciones de pago */}
          <div className="form-group col-span-2">
            <label className="form-label">Condiciones de pago</label>
            <input
              {...register('condiciones_pago')}
              className="form-input"
              placeholder="Ej: 30% adelanto + 70% antes de embarque"
            />
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminar */}
      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => eliminar(confirmDel.proveedor_id)}
        title="Desactivar proveedor"
        message={`¿Seguro que querés desactivar a "${confirmDel?.nombre}"? No se borrará, solo quedará inactivo.`}
        danger
      />
    </div>
  );
}
