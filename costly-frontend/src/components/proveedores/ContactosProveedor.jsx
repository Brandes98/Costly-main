// ============================================================
// src/components/proveedores/ContactosProveedor.jsx
// ============================================================
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Spinner from '../ui/Spinner'

// ── Hook local — defensivo contra cualquier respuesta del backend
const useContactos = (proveedor_id) =>
  useQuery({
    queryKey: ['contactos', proveedor_id],
    queryFn: () => api.get(`/proveedores/${proveedor_id}/contactos`),
    select:  (res) => {
      if (Array.isArray(res))       return res
      if (Array.isArray(res?.data)) return res.data
      return []
    },
    enabled: !!proveedor_id,
  })

// ── Formulario de contacto
function ContactoForm({ initial = {}, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    nombre:         initial.nombre         || '',
    cargo:          initial.cargo          || '',
    email:          initial.email          || '',
    telefono:       initial.telefono       || '',
    predeterminado: initial.predeterminado || false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="bg-sur2 border border-border rounded-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input className="form-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Zhang Wei" />
        </div>
        <div className="form-group">
          <label className="form-label">Cargo</label>
          <input className="form-input" value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ej: Sales Manager" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contacto@proveedor.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input className="form-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+86 123 456 7890" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="pred" checked={form.predeterminado} onChange={e => set('predeterminado', e.target.checked)} className="accent-tl w-4 h-4" />
        <label htmlFor="pred" className="text-xs text-slate cursor-pointer">Marcar como contacto predeterminado</label>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn btn-outline text-xs" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary text-xs" disabled={!form.nombre.trim() || saving} onClick={() => onSave(form)}>
          {saving ? 'Guardando...' : '✓ Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Componente principal
export default function ContactosProveedor({ proveedorId }) {
  const qc = useQueryClient()
  const [agregando,  setAgregando]  = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const { data, isLoading } = useContactos(proveedorId)

  // Garantizar que siempre sea array sin importar qué devuelva el backend
  const contactos = Array.isArray(data) ? data : []
  console.log('data:', data, 'contactos:', contactos, 'proveedorId:', proveedorId)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contactos', proveedorId] })

  const { mutate: crear,     isPending: creando     } = useMutation({
    mutationFn: (d) => api.post(`/proveedores/${proveedorId}/contactos`, d),
    onSuccess:  () => { invalidate(); setAgregando(false) },
  })
  const { mutate: actualizar, isPending: actualizando } = useMutation({
    mutationFn: ({ id, data: d }) => api.patch(`/proveedores/${proveedorId}/contactos/${id}`, d),
    onSuccess:  () => { invalidate(); setEditando(null) },
  })
  const { mutate: setPred } = useMutation({
    mutationFn: (id) => api.patch(`/proveedores/${proveedorId}/contactos/${id}/predeterminado`),
    onSuccess:  invalidate,
  })
  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => api.delete(`/proveedores/${proveedorId}/contactos/${id}`),
    onSuccess:  () => { invalidate(); setConfirmDel(null) },
  })

  if (isLoading || data === undefined) return <div className="flex justify-center py-6"><Spinner /></div>

  return (
    <div className="space-y-3">
      {contactos.length === 0 && !agregando ? (
        <div className="rounded-card border border-border py-6 text-center text-xs text-mist">
          Sin contactos registrados
        </div>
      ) : (
        <div className="space-y-2">
          {(contactos ?? []).map(c => (
            <div key={c.contacto_id}>
              {editando === c.contacto_id ? (
                <ContactoForm
                  initial={c}
                  saving={actualizando}
                  onCancel={() => setEditando(null)}
                  onSave={(d) => actualizar({ id: c.contacto_id, data: d })}
                />
              ) : (
                <div className={`flex items-center justify-between rounded-card border px-4 py-3 transition-all
                  ${c.predeterminado ? 'border-tl bg-tl-xl' : 'border-border bg-sur'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${c.predeterminado ? 'bg-tl text-white' : 'bg-sur3 text-mist'}`}>
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">{c.nombre}</span>
                        {c.predeterminado && (
                          <span className="pill pill-blue" style={{fontSize:'9px',padding:'1px 6px'}}>★ Predeterminado</span>
                        )}
                      </div>
                      {c.cargo && <div className="text-[10px] text-mist">{c.cargo}</div>}
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.email    && <a href={`mailto:${c.email}`} className="text-[10px] text-tl hover:underline" onClick={e => e.stopPropagation()}>✉ {c.email}</a>}
                        {c.telefono && <span className="text-[10px] text-mist">📞 {c.telefono}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!c.predeterminado && (
                      <button className="btn btn-outline text-[10px] px-2 py-1 hover:border-tl hover:text-tl" onClick={() => setPred(c.contacto_id)}>
                        ★ Predeterminar
                      </button>
                    )}
                    <button className="btn btn-outline text-[10px] px-2 py-1" onClick={() => setEditando(c.contacto_id)}>✏️</button>
                    {!c.predeterminado && (
                      <button className="btn btn-outline text-[10px] px-2 py-1 hover:border-rs hover:text-rs" onClick={() => setConfirmDel(c)}>🗑</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {agregando ? (
        <ContactoForm saving={creando} onCancel={() => setAgregando(false)} onSave={crear} />
      ) : (
        <button className="btn btn-outline text-xs w-full border-dashed" onClick={() => setAgregando(true)}>
          ＋ Agregar contacto
        </button>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
            <div className="font-semibold text-ink">¿Eliminar contacto?</div>
            <div className="text-xs text-mist">
              Se eliminará a <strong className="text-ink">{confirmDel.nombre}</strong>. Esta acción no se puede deshacer.
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline text-xs" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger text-xs" onClick={() => eliminar(confirmDel.contacto_id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
