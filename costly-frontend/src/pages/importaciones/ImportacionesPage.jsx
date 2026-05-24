import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Spinner, { Modal } from '../../components/ui/Spinner';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { useImportaciones, usePedidos } from '../../hooks/useApi';
import { exportarPDF, exportarExcel } from '../../hooks/useExportImportacion';
import api from '../../lib/api';
import {
  fmtDate, importacionEstadoOptions, importacionEstadoPillClass,
  importacionSemaforoClass, importacionEstadoLabel, estadoLabel, estadoPillClass,
} from '../../lib/utils';

function resumenPedidos(pedidos = []) { return pedidos.map(p => p.codigo).join(' + ') }
function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map(p => p.proveedor?.nombre).filter(Boolean))]
}

// ── Menú de acciones
function AccionesMenu({ imp, onNota, onEliminar }) {
  const navigate        = useNavigate()
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const opciones = [
    { label: '📝 Agregar nota',    action: () => { setOpen(false); onNota(imp) } },
    { label: '✏️ Editar',          action: () => { setOpen(false); navigate(`/importaciones/${imp.importacion_id}/editar`) } },
    { divider: true },
    { label: '📄 Ver / Exportar PDF', action: () => { setOpen(false); exportarPDF(imp.importacion_id) } },
    { label: '📊 Exportar Excel',     action: () => { setOpen(false); exportarExcel(imp.importacion_id) } },
    { divider: true },
    { label: '🗑 Eliminar',        danger: true, action: () => { setOpen(false); onEliminar(imp) } },
  ]

  return (
    <div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
      <button
        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-sur hover:bg-sur2 hover:border-tl/40 transition-all text-mist hover:text-ink"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-base leading-none font-bold tracking-tight">···</span>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 rounded-card border border-border bg-sur shadow-xl py-1">
          {opciones.map((op, i) =>
            op.divider ? <div key={i} className="my-1 border-t border-border-lt" /> : (
              <button key={i} onClick={op.action}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${op.danger ? 'text-rs hover:bg-rs-l' : 'text-ink hover:bg-sur2'}`}>
                {op.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal nota
function ModalNota({ imp, onClose, onSave, saving }) {
  const [nota, setNota] = useState(imp.nota || '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-ink">Nota de importación</div>
            <div className="text-xs text-mist">{imp.codigo}</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="px-5 py-4">
          <textarea className="form-input min-h-[100px] resize-none" placeholder="Escribí una nota..."
            value={nota} onChange={e => setNota(e.target.value)} maxLength={300} />
          <div className="text-[10px] text-mist text-right mt-1">{nota.length}/300</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary text-xs" disabled={saving} onClick={() => onSave(nota)}>
            {saving ? 'Guardando...' : '✓ Guardar nota'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal eliminar
function ModalEliminar({ imp, onClose, onConfirm, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
        <div className="font-semibold text-ink">¿Eliminar importación?</div>
        <div className="text-xs text-mist">
          Se eliminará <strong className="text-ink">{imp.codigo}</strong> y los pedidos quedarán sin importación asignada.
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger text-xs" disabled={saving} onClick={onConfirm}>
            {saving ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal unir importaciones
function ModalUnir({ importaciones, onClose, onConfirm, saving }) {
  const [selIds, setSelIds] = useState([])
  const toggle = (id) => setSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-ink">Unir importaciones</div>
            <div className="text-xs text-mist">Los pedidos de las importaciones seleccionadas se unirán en una nueva</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {importaciones.filter(i => i.estado !== 'cerrada').map(imp => {
            const sel = selIds.includes(imp.importacion_id)
            return (
              <div key={imp.importacion_id} onClick={() => toggle(imp.importacion_id)}
                className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2.5 transition-all
                  ${sel ? 'border-tl bg-tl-xl' : 'border-border bg-sur hover:border-tl/40'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${sel ? 'border-tl bg-tl' : 'border-border'}`}>
                    {sel && <span className="text-[9px] font-bold text-white">✓</span>}
                  </div>
                  <div>
                    <div className="text-xs font-medium">{imp.codigo}</div>
                    <div className="text-[10px] text-mist">{imp.pedidos?.map(p => p.codigo).join(' + ')}</div>
                  </div>
                </div>
                <span className={`pill ${importacionEstadoPillClass(imp.estado)}`}>
                  {importacionEstadoLabel(imp.estado)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary text-xs" disabled={selIds.length < 2 || saving}
            onClick={() => onConfirm(selIds)}>
            {saving ? 'Uniendo...' : `Unir ${selIds.length} importaciones`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal separar importación
function ModalSeparar({ imp, onClose, onConfirm, saving }) {
  const [selIds, setSelIds] = useState([])
  const pedidos = imp.pedidos || []
  const toggle  = (id) => setSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-ink">Separar importación</div>
            <div className="text-xs text-mist">Seleccioná los pedidos que querés separar en una nueva importación</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {pedidos.length <= 1 ? (
            <div className="py-4 text-center text-xs text-mist">
              Esta importación solo tiene un pedido — no se puede separar
            </div>
          ) : pedidos.map(p => {
            const sel = selIds.includes(p.pedido_id)
            return (
              <div key={p.pedido_id} onClick={() => toggle(p.pedido_id)}
                className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2.5 transition-all
                  ${sel ? 'border-rs bg-rs-l' : 'border-border bg-sur hover:border-rs/40'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${sel ? 'border-rs bg-rs' : 'border-border'}`}>
                    {sel && <span className="text-[9px] font-bold text-white">✓</span>}
                  </div>
                  <div>
                    <div className="text-xs font-medium">{p.codigo}</div>
                    <div className="text-[10px] text-mist">{p.proveedor?.nombre} · {estadoLabel(p.estado)}</div>
                  </div>
                </div>
                <span className={`pill ${estadoPillClass(p.estado)}`}>{estadoLabel(p.estado)}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger text-xs"
            disabled={selIds.length === 0 || selIds.length === pedidos.length || saving}
            onClick={() => onConfirm(selIds)}>
            {saving ? 'Separando...' : `Separar ${selIds.length} pedido${selIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal
export default function ImportacionesPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [estado,       setEstado]      = useState('')
  const [search,       setSearch]      = useState('')
  const [modalOpen,    setModalOpen]   = useState(false)
  const [selIds,       setSelIds]      = useState([])
  const [nota,         setNota]        = useState('')
  const [facturasPedido, setFacturasPedido] = useState({}) // { pedido_id: { show, data, archivo } }
  const [modalNota,    setModalNota]   = useState(null)
  const [modalElim,    setModalElim]   = useState(null)
  const [modalUnir,    setModalUnir]   = useState(false)
  const [modalSeparar, setModalSeparar]= useState(null)
  const [seleccionados, setSeleccionados] = useState([]) // importacion_ids

  const { data: importaciones = [], isLoading, isError } = useImportaciones({ estado: estado || undefined })
  const { data: pedidosSinImp = [], isLoading: loadingPedidos } = usePedidos({ sin_importacion: 'true' })

  // ── Mutations
  const { mutate: crearImportacion, isPending: creando } = useMutation({
    mutationFn: (data) => api.post('/pedidos/unir', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      setModalOpen(false); setSelIds([]); setNota('')
    },
  })

  const { mutate: guardarNota, isPending: savingNota } = useMutation({
    mutationFn: ({ id, nota }) => api.patch(`/importaciones/${id}`, { nota }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['importaciones'] }); setModalNota(null) },
  })

  const { mutate: eliminar, isPending: eliminando } = useMutation({
    mutationFn: (id) => api.delete(`/importaciones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['importaciones'] }); setModalElim(null) },
    onError: (e) => alert(e?.message || 'No se pudo eliminar'),
  })

  // Guardar factura de un pedido
  const { mutate: guardarFacturaNueva } = useMutation({
    mutationFn: ({ pedido_id, proveedor_id, fData, archivo }) => {
      const formData = new FormData()
      formData.append('pedido_id',    pedido_id)
      formData.append('proveedor_id', proveedor_id)
      formData.append('numero',  fData.numero)
      formData.append('fecha',   new Date(fData.fecha).toISOString())
      formData.append('monto',   Number(fData.monto))
      formData.append('moneda',  fData.moneda)
      formData.append('tipo',    fData.tipo)
      if (fData.nota)  formData.append('nota',    fData.nota)
      if (archivo)     formData.append('archivo', archivo)
      return api.post('/facturas', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })

  const cerrarModal = () => { setModalOpen(false); setSelIds([]); setNota(''); setFacturasPedido({}) }

  // Crear importación — guardar facturas primero si las hay
  const handleCrearImportacion = async () => {
    // Guardar facturas opcionales
    for (const [pedido_id, f] of Object.entries(facturasPedido)) {
      if (f.show && f.data?.numero && f.data?.fecha && f.data?.monto) {
        const pedido = pedidosSinImp.find(p => p.pedido_id === Number(pedido_id))
        if (pedido) {
          await new Promise((res, rej) =>
            guardarFacturaNueva({ pedido_id: Number(pedido_id), proveedor_id: pedido.proveedor_id, fData: f.data, archivo: f.archivo },
              { onSuccess: res, onError: rej })
          )
        }
      }
    }
    crearImportacion({ pedido_ids: selIds, nota: nota || undefined })
  }

  // Unir importaciones — juntar los pedidos de todas en una nueva
  const { mutate: unirImportaciones, isPending: uniendo } = useMutation({
    mutationFn: async (impIds) => {
      // Obtener todos los pedido_ids de las importaciones seleccionadas
      const pedidoIds = importaciones
        .filter(i => impIds.includes(i.importacion_id))
        .flatMap(i => (i.pedidos || []).map(p => p.pedido_id))
      // Primero desasociar pedidos de sus importaciones
      for (const impId of impIds) {
        await api.delete(`/importaciones/${impId}`)
      }
      // Crear nueva importación con todos los pedidos
      return api.post('/pedidos/unir', { pedido_ids: pedidoIds, nota: 'Importaciones unidas' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      setModalUnir(false)
    },
    onError: (e) => alert(e?.message || 'Error al unir importaciones'),
  })

  // Separar — quitar pedidos seleccionados y crear nueva importación
  const { mutate: separarImportacion, isPending: separando } = useMutation({
    mutationFn: async ({ impId, pedidoIds }) => {
      // Quitar pedidos de esta importación
      for (const pid of pedidoIds) {
        await api.delete(`/importaciones/${impId}/pedidos/${pid}`)
      }
      // Crear nueva importación con los pedidos separados
      return api.post('/pedidos/unir', { pedido_ids: pedidoIds, nota: 'Pedidos separados de importación' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['importaciones'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      setModalSeparar(null)
    },
    onError: (e) => alert(e?.message || 'Error al separar'),
  })

  // ── Helpers selección (solo sin costeo)
  const toggleSeleccion = (id) =>
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleTodos = () => {
    const disponibles = filteredRows.filter(i => i.costeoEstado === 'Pendiente').map(i => i.importacion_id)
    setSeleccionados(prev => prev.length === disponibles.length ? [] : disponibles)
  }

  const rows = useMemo(() =>
    importaciones.map(imp => ({
      ...imp,
      proveedores:    resumenProveedores(imp.pedidos),
      pedidosResumen: resumenPedidos(imp.pedidos),
      pedidosCount:   imp._count?.pedidos ?? imp.pedidos?.length ?? 0,
      costeoEstado:   imp._count?.costeos > 0 ? 'Registrado' : 'Pendiente',
    })), [importaciones])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(item =>
      item.codigo?.toLowerCase().includes(q) ||
      item.pedidosResumen?.toLowerCase().includes(q) ||
      item.proveedores?.some(p => p.toLowerCase().includes(q))
    )
  }, [rows, search])

  const togglePedido = (id) =>
    setSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])


  return (
    <div className="space-y-4 w-full min-w-0">
      {isError && (
        <div className="rounded-card border border-rs/20 bg-rs-l px-4 py-3 text-xs text-rs">
          No pudimos cargar las importaciones del backend.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar importación..."
            filters={[{ value: estado, onChange: setEstado, options: importacionEstadoOptions, placeholder: 'Todos los estados' }]}
            createLabel="Nueva importación"
            onCreate={() => setModalOpen(true)}
          />
        </div>
        <button className="btn btn-outline text-xs shrink-0" onClick={() => setModalUnir(true)}>
          🔗 Unir importaciones
        </button>
      </div>

      {/* Tabla */}
      <TableCard
        title="🚢 Importaciones consolidadas"
        countLabel={`${filteredRows.length} importaciones activas`}
        loading={isLoading}
        isEmpty={filteredRows.length === 0}
        emptyMessage="No hay importaciones que mostrar"
      >
        <TableContainer minWidth="min-w-[960px]">
          <thead>
            <tr>
              <th className="w-8 pl-3">
                <input type="checkbox" className="accent-tl w-3.5 h-3.5 cursor-pointer"
                  checked={seleccionados.length > 0 && seleccionados.length === filteredRows.filter(i => i.costeoEstado === 'Pendiente').length}
                  onChange={toggleTodos} />
              </th>
              <th>Código</th>
              <th>Proveedores agrupados</th>
              <th>Pedidos</th>
              <th>Contenedor</th>
              <th>Estado</th>
              <th>Fecha unión</th>
              <th>Costeo</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(item => (
              <tr key={item.importacion_id} className="cursor-pointer"
                onClick={() => navigate(`/importaciones/${item.importacion_id}`)}>
                <td className="pl-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {item.costeoEstado === 'Pendiente' ? (
                      <input type="checkbox"
                        className="accent-tl w-3.5 h-3.5 cursor-pointer"
                        checked={seleccionados.includes(item.importacion_id)}
                        onChange={() => toggleSeleccion(item.importacion_id)}
                      />
                    ) : (
                      <div className="w-3.5 h-3.5" />
                    )}
                    <span className={`s3 ${importacionSemaforoClass(item.estado)}`} />
                  </div>
                </td>
                <td>
                  <strong>{item.codigo}</strong>
                  {item.nota && (
                    <div className="text-[10px] text-mist truncate max-w-[140px]" title={item.nota}>
                      📝 {item.nota}
                    </div>
                  )}
                  <div className="text-[10px] text-tl">{item.pedidosResumen || 'Sin pedidos'}</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {item.proveedores.length > 0
                      ? item.proveedores.map(p => <span key={`${item.importacion_id}-${p}`} className="ic">{p}</span>)
                      : <span className="text-xs text-mist">Sin proveedor</span>}
                  </div>
                </td>
                <td className="text-center font-semibold">{item.pedidosCount}</td>
                <td className="text-[11px] text-mist">{item.contenedor || 'Pendiente'}</td>
                <td>
                  <span className={`pill ${importacionEstadoPillClass(item.estado)}`}>
                    {importacionEstadoLabel(item.estado)}
                  </span>
                </td>
                <td className="text-[11px] text-mist">{fmtDate(item.fecha_union || item.creado_en)}</td>
                <td>
                  <span className={`pill ${item.costeoEstado === 'Registrado' ? 'pill-green' : 'pill-yellow'}`}>
                    {item.costeoEstado}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {item.estado !== 'cerrada' && item.pedidosCount > 1 && (
                      <button
                        className="btn btn-outline text-[10px] px-2 py-1 hover:border-am hover:text-am"
                        onClick={() => setModalSeparar(item)}
                        title="Separar pedidos"
                      >
                        ✂️
                      </button>
                    )}
                    <AccionesMenu
                      imp={item}
                      onNota={setModalNota}
                      onEliminar={setModalElim}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      </TableCard>

      {/* ── Botón flotante */}
      {seleccionados.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-ink text-white rounded-full px-5 py-3 shadow-xl">
            <span className="text-xs font-medium">
              {seleccionados.length} importación{seleccionados.length > 1 ? 'es' : ''} seleccionada{seleccionados.length > 1 ? 's' : ''}
            </span>
            <div className="w-px h-4 bg-white/20" />
            <button className="text-xs font-semibold text-tl-l hover:text-white transition-colors"
              onClick={() => setSeleccionados([])}>
              Limpiar
            </button>
            <button
              className="bg-rs text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-rs-d transition-colors"
              onClick={async () => {
                if (!window.confirm(`¿Devolver los pedidos de ${seleccionados.length} importación${seleccionados.length > 1 ? 'es' : ''}? Los pedidos quedarán sin importación asignada.`)) return
                try {
                  for (const impId of seleccionados) {
                    await api.delete(`/importaciones/${impId}`)
                  }
                  setSeleccionados([])
                  qc.invalidateQueries({ queryKey: ['importaciones'] })
                  qc.invalidateQueries({ queryKey: ['pedidos'] })
                } catch (e) {
                  alert(e?.message || 'Error al devolver pedidos')
                }
              }}>
              ↩ Devolver pedidos
            </button>
            <button
              className="bg-tl text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-tl-d transition-colors"
              onClick={() => {
                navigate('/costeos', { state: { importacion_ids: seleccionados } })
                setSeleccionados([])
              }}>
              💰 Mover a costeo
            </button>
          </div>
        </div>
      )}

      {/* ── Modal nueva importación */}
      <Modal open={modalOpen} onClose={cerrarModal} title="Nueva importación"
        footer={<>
          <button className="btn btn-outline" onClick={cerrarModal}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCrearImportacion}
            disabled={selIds.length === 0 || creando}>
            {creando ? 'Creando...' : `Crear importación${selIds.length > 0 ? ` (${selIds.length} pedido${selIds.length > 1 ? 's' : ''})` : ''}`}
          </button>
        </>}>
        <div className="space-y-4">
          <div className="rounded-card border border-tl/20 bg-tl-xl px-3 py-2 text-xs text-slate">
            Un solo pedido → <strong className="text-tl">individual</strong>. Dos o más → <strong className="text-tl">consolidada</strong>.
          </div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-mist">
            Pedidos disponibles ({pedidosSinImp.length})
          </div>
          {loadingPedidos ? <div className="flex justify-center py-6"><Spinner /></div>
            : pedidosSinImp.length === 0
              ? <div className="rounded-card border border-border py-6 text-center text-xs text-mist">No hay pedidos disponibles</div>
              : <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                  {pedidosSinImp.map(p => {
                    const sel = selIds.includes(p.pedido_id)
                    return (
                      <div key={p.pedido_id} className="rounded-card border transition-all overflow-hidden"
                        style={{borderColor: sel ? 'var(--tl)' : 'var(--border)'}}>
                        {/* Fila principal */}
                        <div onClick={() => togglePedido(p.pedido_id)}
                          className={`flex cursor-pointer items-center justify-between px-3 py-2.5 transition-all
                            ${sel ? 'bg-tl-xl' : 'bg-sur hover:bg-sur2'}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${sel ? 'border-tl bg-tl' : 'border-border'}`}>
                              {sel && <span className="text-[9px] font-bold text-white">✓</span>}
                            </div>
                            <div>
                              <div className="text-xs font-medium">{p.codigo}</div>
                              <div className="text-[10px] text-mist">{p.proveedor?.nombre || '—'} · {p._count?.lineas ?? 0} líneas</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.facturas?.length > 0
                              ? <span className="pill pill-green text-[9px]">✓ Factura</span>
                              : sel && <span className="pill pill-yellow text-[9px]">Sin factura</span>}
                            <span className={`pill ${p.estado === 'confirmado' ? 'pill-green' : 'pill-yellow'}`}>{p.estado}</span>
                          </div>
                        </div>
                        {/* Sección factura — solo si está seleccionado y no tiene factura */}
                        {sel && !p.facturas?.length && (
                          <div className="border-t border-border px-3 py-2.5 bg-sur space-y-2">
                            {!facturasPedido[p.pedido_id]?.show ? (
                              <button type="button" className="text-[10px] text-tl hover:underline"
                                onClick={e => { e.stopPropagation(); setFacturasPedido(prev => ({...prev, [p.pedido_id]: { show: true, data: { numero:'', fecha:'', monto:'', moneda:'USD', tipo:'comercial', nota:'' }, archivo: null }})) }}>
                                📎 Agregar factura (opcional)
                              </button>
                            ) : (
                              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="form-group">
                                    <label className="form-label text-[10px]">Número</label>
                                    <input className="form-input h-7 text-xs" placeholder="INV-001"
                                      value={facturasPedido[p.pedido_id]?.data?.numero || ''}
                                      onChange={e => setFacturasPedido(prev => ({...prev, [p.pedido_id]: {...prev[p.pedido_id], data: {...prev[p.pedido_id].data, numero: e.target.value}}}))} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-[10px]">Fecha</label>
                                    <input type="date" className="form-input h-7 text-xs"
                                      value={facturasPedido[p.pedido_id]?.data?.fecha || ''}
                                      onChange={e => setFacturasPedido(prev => ({...prev, [p.pedido_id]: {...prev[p.pedido_id], data: {...prev[p.pedido_id].data, fecha: e.target.value}}}))} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-[10px]">Monto</label>
                                    <input type="number" step="0.01" className="form-input h-7 text-xs" placeholder="0.00"
                                      value={facturasPedido[p.pedido_id]?.data?.monto || ''}
                                      onChange={e => setFacturasPedido(prev => ({...prev, [p.pedido_id]: {...prev[p.pedido_id], data: {...prev[p.pedido_id].data, monto: e.target.value}}}))} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-[10px]">Moneda</label>
                                    <select className="form-input h-7 text-xs"
                                      value={facturasPedido[p.pedido_id]?.data?.moneda || 'USD'}
                                      onChange={e => setFacturasPedido(prev => ({...prev, [p.pedido_id]: {...prev[p.pedido_id], data: {...prev[p.pedido_id].data, moneda: e.target.value}}}))}>
                                      <option value="USD">USD</option>
                                      <option value="EUR">EUR</option>
                                      <option value="CNY">CNY</option>
                                      <option value="CRC">CRC</option>
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-[10px]">Tipo</label>
                                    <select className="form-input h-7 text-xs"
                                      value={facturasPedido[p.pedido_id]?.data?.tipo || 'comercial'}
                                      onChange={e => setFacturasPedido(prev => ({...prev, [p.pedido_id]: {...prev[p.pedido_id], data: {...prev[p.pedido_id].data, tipo: e.target.value}}}))}>
                                      <option value="comercial">Comercial</option>
                                      <option value="proforma">Proforma</option>
                                      <option value="credito">Crédito</option>
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-[10px]">📎 Archivo</label>
                                    <label className="flex items-center gap-1 cursor-pointer rounded border border-dashed border-border bg-sur2 px-2 py-1 hover:border-tl/40">
                                      <span className="text-[9px] text-mist truncate max-w-[100px]">
                                        {facturasPedido[p.pedido_id]?.archivo?.name || 'Seleccionar...'}
                                      </span>
                                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                                        onChange={e => setFacturasPedido(prev => ({...prev, [p.pedido_id]: {...prev[p.pedido_id], archivo: e.target.files?.[0] || null}}))} />
                                    </label>
                                  </div>
                                </div>
                                <button type="button" className="text-[9px] text-mist hover:text-rs"
                                  onClick={() => setFacturasPedido(prev => ({...prev, [p.pedido_id]: { show: false, data: null, archivo: null }}))}>
                                  Cancelar factura
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
          }
          <div>
            <label className="form-label">Nota (opcional)</label>
            <input type="text" className="form-input" placeholder="Ej: Consolidado por espacio en contenedor"
              value={nota} onChange={e => setNota(e.target.value)} />
          </div>
          {selIds.length > 0 && (
            <div className="rounded-card border border-border bg-sur2 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-mist">Seleccionados</span><span className="font-semibold">{selIds.length}</span></div>
              <div className="flex justify-between"><span className="text-mist">Tipo</span>
                <span className="font-semibold text-tl">{selIds.length === 1 ? 'Individual' : 'Consolidada'}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal nota */}
      {modalNota && (
        <ModalNota imp={modalNota} saving={savingNota}
          onClose={() => setModalNota(null)}
          onSave={nota => guardarNota({ id: modalNota.importacion_id, nota })} />
      )}

      {/* ── Modal eliminar */}
      {modalElim && (
        <ModalEliminar imp={modalElim} saving={eliminando}
          onClose={() => setModalElim(null)}
          onConfirm={() => eliminar(modalElim.importacion_id)} />
      )}

      {/* ── Modal unir importaciones */}
      {modalUnir && (
        <ModalUnir importaciones={importaciones} saving={uniendo}
          onClose={() => setModalUnir(false)}
          onConfirm={unirImportaciones} />
      )}

      {/* ── Modal separar importación */}
      {modalSeparar && (
        <ModalSeparar imp={modalSeparar} saving={separando}
          onClose={() => setModalSeparar(null)}
          onConfirm={pedidoIds => separarImportacion({ impId: modalSeparar.importacion_id, pedidoIds })} />
      )}
    </div>
  )
}
