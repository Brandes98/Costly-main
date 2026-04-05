import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useProveedores,
  useCreateProveedor,
  useUpdateProveedor,
  useDeleteProveedor,
} from '../../hooks/useApi';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { Modal, Confirm } from '../../components/ui/Spinner';
import { FaPen, FaTrash } from 'react-icons/fa';

// ── Schema
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
  const { data: paises = [] } = useQuery({
    queryKey: ['paises'],
    queryFn: () =>
      api.get('/proveedores').then(() =>
        // Los países vienen del backend — por ahora usamos los del seed
        fetch('/api/v1/proveedores')
          .then((r) => r.json())
          .then((r) => []),
      ),
    enabled: false,
  });

  // Usamos los países que vienen en los proveedores + fallback hardcoded
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
    (p) =>
      !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.pais?.nombre?.toLowerCase().includes(search.toLowerCase()),
  );

  const abrirCrear = () => {
    setEditando(null);
    reset({ moneda: 'USD', pais_id: '' });
    setModalOpen(true);
  };

  const abrirEditar = (p) => {
    setEditando(p);
    reset({
      pais_id: p.pais_id,
      nombre: p.nombre,
      ciudad: p.ciudad || '',
      incoterm_pref: p.incoterm_pref || '',
      moneda: p.moneda,
      dias_transito: p.dias_transito || '',
      puerto_origen: p.puerto_origen || '',
      condiciones_pago: p.condiciones_pago || '',
      contacto: p.contacto || '',
      email: p.email || '',
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
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 h-8 px-3 text-xs text-mist border border-border rounded-lg bg-sur2 w-52">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-ink placeholder:text-mist"
            />
          </div>
        </div>
        <button className="btn btn-primary text-xs" onClick={abrirCrear}>
          ＋ Nuevo proveedor
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🏭 Proveedores</div>
          <span className="text-[11.5px] text-mist">{filtered.length} registros</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🏭</div>
            <div className="text-sm font-medium text-ink mb-1">Sin proveedores</div>
            <div className="text-xs text-mist mb-4">Agregá tu primer proveedor para empezar</div>
            <button className="btn btn-primary text-xs" onClick={abrirCrear}>
              ＋ Crear proveedor
            </button>
          </div>
        ) : (
          <table className="tbl">
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
              {filtered.map((p) => (
                <tr key={p.proveedor_id}>
                  <td>
                    <div className="font-medium text-xs">{p.nombre}</div>
                    {p.ciudad && <div className="text-[10px] text-mist">{p.ciudad}</div>}
                  </td>
                  <td>
                    <span className="ic">
                      {p.pais?.bandera} {p.pais?.nombre}
                    </span>
                  </td>
                  <td className="font-medium text-xs">{p.moneda}</td>
                  <td>
                    {p.incoterm_pref ? (
                      <span className="incb">{p.incoterm_pref}</span>
                    ) : (
                      <span className="text-mist text-xs">—</span>
                    )}
                  </td>
                  <td className="text-xs text-mist">
                    {p.dias_transito ? `${p.dias_transito} días` : '—'}
                  </td>
                  <td className="text-xs">
                    {p.email ? (
                      <a href={`mailto:${p.email}`} className="text-tl hover:underline">
                        {p.email}
                      </a>
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
                        <FaPen />
                      </button>
                      <button
                        className="btn btn-outline text-xs px-2 py-1 hover:border-rs hover:text-rs"
                        onClick={() => setConfirmDel(p)}
                      >
                        <FaTrash />
                      </button>
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

          {/* País */}
          <div className="form-group">
            <label className="form-label">País *</label>
            <select {...register('pais_id')} className="form-input">
              <option value="">Seleccionar...</option>
              {paisesComunes.map((p) => (
                <option key={p.pais_id} value={p.pais_id}>
                  {p.bandera} {p.nombre}
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
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
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
              {INCOTERMS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          {/* Días tránsito */}
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
