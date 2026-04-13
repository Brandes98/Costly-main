import { useState } from 'react';
import { useUsuarios, useMe, useCreateUsuario, useUpdateUsuario, useDeactivateUsuario } from '../../hooks/useApi';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { Modal, Confirm } from '../../components/ui/Modal';
import { IconButton } from '../../components/ui/Button';
import { fmtDate } from '../../lib/utils';

const ROL_LABEL = {
  admin: 'Admin',
  operador_sr: 'Operador Sr.',
  operador: 'Operador',
  finanzas: 'Finanzas',
  consultas: 'Consultas',
};

const ROL_PILL = {
  admin: 'pill-violet',
  operador_sr: 'pill-blue',
  operador: 'pill-blue',
  finanzas: 'pill-yellow',
  consultas: 'pill-gray',
};

const ROL_AVATAR_BG = {
  admin: 'linear-gradient(135deg,var(--vi),#3A2B9A)',
  operador_sr: 'linear-gradient(135deg,var(--tl),#0D4A4A)',
  operador: 'linear-gradient(135deg,var(--tl),#0D4A4A)',
  finanzas: 'linear-gradient(135deg,var(--am),#7A5010)',
  consultas: 'linear-gradient(135deg,var(--mist),#444)',
};

const ROL_OPTIONS = ['consultas', 'operador', 'finanzas', 'operador_sr', 'admin'].map((v) => ({
  value: v,
  label: ROL_LABEL[v],
}));

function getInitials(nombre = '') {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function Avatar({ nombre, rol }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
      style={{ background: ROL_AVATAR_BG[rol] ?? ROL_AVATAR_BG.consultas }}
    >
      {getInitials(nombre)}
    </div>
  );
}

const EMPTY_FORM = { nombre: '', email: '', rol: 'operador' };

export default function UsuariosPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [showInactivos, setShowInactivos] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ nombre: '', rol: '' });

  const { data: usuarios = [], isLoading } = useUsuarios(showInactivos ? {} : { activo: 'true' });
  const { data: meData } = useMe();
  const myId = meData?.data?.usuario_id ?? meData?.usuario_id;

  const createUsuario = useCreateUsuario();
  const updateUsuario = useUpdateUsuario();
  const deactivateUsuario = useDeactivateUsuario();

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const editField = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = () => {
    if (!form.nombre || !form.email || !form.rol) return;
    createUsuario.mutate(form, {
      onSuccess: () => {
        setShowCreate(false);
        setForm(EMPTY_FORM);
      },
    });
  };

  const handleOpenEdit = (u) => {
    setEditTarget(u);
    setEditForm({ nombre: u.nombre, rol: u.rol });
  };

  const handleSaveEdit = () => {
    if (!editTarget) return;
    updateUsuario.mutate(
      { id: editTarget.usuario_id, nombre: editForm.nombre, rol: editForm.rol },
      { onSuccess: () => setEditTarget(null) },
    );
  };

  const handleDeactivate = () => {
    if (!confirmTarget) return;
    deactivateUsuario.mutate(confirmTarget.usuario_id, {
      onSuccess: () => setConfirmTarget(null),
    });
  };

  const activos = usuarios.filter((u) => u.activo).length;

  const filtered = search.trim()
    ? usuarios.filter((u) =>
        u.nombre.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : usuarios;

  return (
    <div className="space-y-4">
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar usuario..."
        switches={[
          { label: 'Ver inactivos', value: showInactivos, onChange: setShowInactivos },
        ]}
        createLabel="Nuevo usuario"
        onCreate={() => setShowCreate(true)}
      />

      <TableCard
        title="👤 Usuarios"
        countLabel={`${activos} activos`}
        loading={isLoading}
        isEmpty={filtered.length === 0}
        emptyMessage="No hay usuarios registrados"
      >
        <TableContainer>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Último acceso</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.usuario_id}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar nombre={u.nombre} rol={u.rol} />
                    <strong>{u.nombre}</strong>
                  </div>
                </td>
                <td className="text-tl text-[11.5px]">{u.email}</td>
                <td>
                  <span className={`pill ${ROL_PILL[u.rol] ?? 'pill-gray'}`}>
                    {ROL_LABEL[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="text-mist text-[11px]">{fmtDate(u.ultimo_acceso)}</td>
                <td>
                  <span className={`pill ${u.activo ? 'pill-green' : 'pill-gray'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <IconButton variant="edit" onClick={() => handleOpenEdit(u)} title="Editar" />
                    {u.activo && u.usuario_id !== myId && (
                      <IconButton
                        variant="delete"
                        onClick={() => setConfirmTarget(u)}
                        title="Desactivar"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      {/* ── Modal: Nuevo usuario ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
        title="Nuevo usuario"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={createUsuario.isPending || !form.nombre || !form.email}
            >
              {createUsuario.isPending ? 'Creando...' : 'Crear usuario'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <input
              className="form-input"
              placeholder="Ej: María Alvarado"
              value={form.nombre}
              onChange={field('nombre')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              className="form-input"
              type="email"
              placeholder="usuario@vadibarot.com"
              value={form.email}
              onChange={field('email')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select className="form-input" value={form.rol} onChange={field('rol')}>
              {ROL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="rounded-card bg-am-l border border-am/30 px-3 py-2 text-xs text-am font-medium">
            La contraseña temporal se genera automáticamente. El usuario deberá cambiarla en el primer ingreso.
          </div>
          {createUsuario.isError && (
            <div className="rounded-card border border-rs/30 bg-rs-l px-3 py-2 text-xs text-rs font-medium">
              {createUsuario.error?.response?.data?.error?.message ?? 'Error al crear el usuario'}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Editar usuario ── */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar usuario"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveEdit}
              disabled={updateUsuario.isPending || !editForm.nombre}
            >
              {updateUsuario.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" value={editForm.nombre} onChange={editField('nombre')} />
          </div>
          <div className="form-group">
            <label className="form-label">Rol</label>
            <select className="form-input" value={editForm.rol} onChange={editField('rol')}>
              {ROL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Confirm: Desactivar usuario ── */}
      <Confirm
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleDeactivate}
        danger
        title="Desactivar usuario"
        message={`¿Desactivar a ${confirmTarget?.nombre}? El usuario perderá acceso al sistema inmediatamente.`}
      />
    </div>
  );
}
