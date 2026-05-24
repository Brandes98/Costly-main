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
import ImportarExcelModal from '../../components/ui/ImportarExcelModal';
import Button, { IconButton } from '../../components/ui/Button';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import ContactosProveedor from '../../components/proveedores/ContactosProveedor';

// Schema
const schema = z.object({
  pais_id:          z.coerce.number().int().positive('Requerido'),
  nombre:           z.string().min(2, 'Mínimo 2 caracteres').max(150),
  ciudad:           z.string().max(100).optional().or(z.literal('')),
  incoterm_pref:    z.enum(['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']).optional().or(z.literal('')),
  moneda:           z.string().length(3, 'Requerido'),
  dias_transito:    z.coerce.number().int().positive().optional().or(z.literal('')),
  puerto_origen:    z.string().max(80).optional().or(z.literal('')),
  condiciones_pago: z.string().max(100).optional().or(z.literal('')),
});

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR'];
const MONEDAS = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'];

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const [modalImport, setModalImport] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [provCreado, setProvCreado] = useState(null); // proveedor recién creado para agregar contactos

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
    { pais_id: 1, nombre: 'Costa Rica',    bandera: '🇨🇷' },
    { pais_id: 3, nombre: 'China',         bandera: '🇨🇳' },
    { pais_id: 2, nombre: 'Estados Unidos',bandera: '🇺🇸' },
    { pais_id: 4, nombre: 'Alemania',      bandera: '🇩🇪' },
    { pais_id: 6, nombre: 'España',        bandera: '🇪🇸' },
    { pais_id: 5, nombre: 'México',        bandera: '🇲🇽' },
    { pais_id: 7, nombre: 'Japón',         bandera: '🇯🇵' },
    { pais_id: 8, nombre: 'Brasil',        bandera: '🇧🇷' },
    { pais_id: 9, nombre: 'Corea del Sur', bandera: '🇰🇷' },
  ];

  const { mutate: crear,   isPending: creando   } = useCreateProveedor();
  const { mutate: editar,  isPending: editando_ } = useUpdateProveedor();
  const { mutate: eliminar                       } = useDeleteProveedor();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
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
      pais_id:          proveedor.pais_id,
      nombre:           proveedor.nombre,
      ciudad:           proveedor.ciudad || '',
      incoterm_pref:    proveedor.incoterm_pref || '',
      moneda:           proveedor.moneda,
      dias_transito:    proveedor.dias_transito || '',
      puerto_origen:    proveedor.puerto_origen || '',
      condiciones_pago: proveedor.condiciones_pago || '',
    });
    setModalOpen(true);
  };

  const onSubmit = (data) => {
    const payload = {
      ...data,
      pais_id:          Number(data.pais_id),
      dias_transito:    data.dias_transito ? Number(data.dias_transito) : undefined,
      ciudad:           data.ciudad || undefined,
      incoterm_pref:    data.incoterm_pref || undefined,
      puerto_origen:    data.puerto_origen || undefined,
      condiciones_pago: data.condiciones_pago || undefined,
    };

    if (editando) {
      editar(
        { id: editando.proveedor_id, ...payload },
        { onSuccess: () => { setModalOpen(false); reset(); } },
      );
    } else {
      crear(payload, {
        onSuccess: (nuevo) => {
          setProvCreado(nuevo?.data ?? nuevo)
          reset()
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
          <div className="flex gap-2">
            <button className="btn btn-outline text-xs" onClick={() => setModalImport(true)}>📥 Importar Excel</button>
            <Button icon="create" onClick={abrirCrear}>Nuevo proveedor</Button>
          </div>
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
            <Button icon="create" onClick={abrirCrear}>Crear proveedor</Button>
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

                  <td>
                    <span className={`pill ${proveedor.activo ? 'pill-green' : 'pill-red'}`}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <IconButton variant="edit"   onClick={() => abrirEditar(proveedor)} title="Editar" />
                      <IconButton variant="delete" onClick={() => setConfirmDel(proveedor)} title="Eliminar" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableContainer>
        )}
      </TableCard>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset(); setProvCreado(null); }}
        title={editando ? `Editar — ${editando.nombre}` : provCreado ? `${provCreado.nombre} — Contactos` : 'Nuevo proveedor'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModalOpen(false); reset(); setProvCreado(null); }}>
              {provCreado && !editando ? 'Listo' : 'Cancelar'}
            </button>
            {!provCreado && (
              <button
                className="btn btn-primary"
                onClick={handleSubmit(onSubmit)}
                disabled={creando || editando_}
              >
                {creando || editando_ ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear proveedor'}
              </button>
            )}
          </>
        }
      >
        {/* ── Si acaba de crear, mostrar solo contactos */}
        {provCreado && !editando ? (
          <div>
            <div className="mb-3 rounded-card border border-sg/20 bg-sg-l px-3 py-2 text-xs text-sg">
              ✅ Proveedor <strong>{provCreado.nombre}</strong> creado. Ahora podés agregar sus contactos.
            </div>
            <ContactosProveedor proveedorId={provCreado.proveedor_id} />
          </div>
        ) : (
          <div>
            {/* ── Datos del proveedor */}
            <div className="grid grid-cols-2 gap-3">
          <div className="form-group col-span-2">
            <label className="form-label">Nombre / Razón social *</label>
            <input {...register('nombre')} className="form-input" placeholder="Ej: Shenzhen Tech Co." />
            {errors.nombre && <span className="text-xs text-rs">{errors.nombre.message}</span>}
          </div>

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

          <div className="form-group">
            <label className="form-label">Ciudad / Puerto</label>
            <input {...register('ciudad')} className="form-input" placeholder="Ej: Shenzhen" />
          </div>

          <div className="form-group">
            <label className="form-label">Moneda habitual *</label>
            <select {...register('moneda')} className="form-input">
              {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.moneda && <span className="text-xs text-rs">{errors.moneda.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Incoterm habitual</label>
            <select {...register('incoterm_pref')} className="form-input">
              <option value="">Sin preferencia</option>
              {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Días de tránsito</label>
            <input {...register('dias_transito')} type="number" className="form-input" placeholder="Ej: 35" />
          </div>

          <div className="form-group">
            <label className="form-label">Puerto de salida habitual</label>
            <input {...register('puerto_origen')} className="form-input" placeholder="Ej: Shanghai" />
          </div>

          <div className="form-group col-span-2">
            <label className="form-label">Condiciones de pago</label>
            <input {...register('condiciones_pago')} className="form-input" placeholder="Ej: 30% adelanto + 70% antes de embarque" />
          </div>
        </div>

            {/* ── Contactos — al editar proveedor existente */}
            {editando && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-mist">
                  Personas de contacto
                </div>
                <ContactosProveedor proveedorId={editando.proveedor_id} />
              </div>
            )}
          </div>
        )}
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
      {modalImport && (
        <ImportarExcelModal
          entidad="proveedores"
          queryKey="proveedores"
          onClose={() => setModalImport(false)}
        />
      )}
    </div>
  );
}
