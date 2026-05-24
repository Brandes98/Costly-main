import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TableCard, TableContainer, TableToolbar } from '../../components/ui/Table';
import { usePedidos, useCreatePedido } from '../../hooks/useApi';
import api from '../../lib/api';
import { exportarPDF, exportarExcel, exportarCosteo } from '../../hooks/useExport';
import {
  estadoLabel, estadoPillClass, fmtDate,
  getSemaforo, pedidoEstadoOptions, semaforoClass,
} from '../../lib/utils';

// ── Dropdown de acciones
function AccionesMenu({ pedido, onAgregarNota, onDuplicar, onEliminar, onConfirmar }) {
  const navigate          = useNavigate()
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  // Cerrar al clickar fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const stop = (e) => e.stopPropagation()

  const opciones = [
    ...(pedido.estado === 'borrador' ? [{
      label: '✅ Confirmar pedido',
      action: () => { setOpen(false); onConfirmar(pedido) }
    }] : []),
    {
      label: '📝 Agregar nota',
      action: () => { setOpen(false); onAgregarNota(pedido) }
    },
    {
      label: '✏️ Editar',
      action: () => { setOpen(false); navigate(`/pedidos/${pedido.pedido_id}/editar`) }
    },
    {
      label: '📋 Duplicar pedido',
      action: () => { setOpen(false); onDuplicar(pedido) }
    },
    { divider: true },
    {
      label: '📄 Ver / Exportar PDF',
      action: () => { setOpen(false); exportarPDF(pedido.pedido_id) }
    },
    {
      label: '📊 Exportar CSV',
      action: () => { setOpen(false); exportarExcel(pedido.pedido_id) }
    },
    {
      label: '💰 Exportar proyección costeo',
      action: () => { setOpen(false); navigate('/costeos', { state: { tipo: 'aproximacion', pedido_ids: [pedido.pedido_id] } }) }
    },
    { divider: true },
    {
      label: '🗑 Eliminar pedido',
      danger: true,
      action: () => { setOpen(false); onEliminar(pedido) }
    },
  ]

  return (
    <div className="relative" ref={ref} onClick={stop}>
      <button
        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-sur hover:bg-sur2 hover:border-tl/40 transition-all text-mist hover:text-ink"
        onClick={() => setOpen(v => !v)}
        title="Acciones"
      >
        <span className="text-base leading-none font-bold tracking-tight">···</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 rounded-card border border-border bg-sur shadow-xl py-1">
          {opciones.map((op, i) =>
            op.divider ? (
              <div key={i} className="my-1 border-t border-border-lt" />
            ) : (
              <button
                key={i}
                onClick={op.action}
                className={`w-full text-left px-3 py-2 text-xs transition-colors
                  ${op.danger
                    ? 'text-rs hover:bg-rs-l'
                    : 'text-ink hover:bg-sur2'
                  }`}
              >
                {op.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal agregar nota
function ModalNota({ pedido, onClose, onSave, saving }) {
  const [nota, setNota] = useState(pedido.nota || '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-ink">Nota del pedido</div>
            <div className="text-xs text-mist">{pedido.codigo}</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>
        <div className="px-5 py-4">
          <textarea
            className="form-input min-h-[100px] resize-none"
            placeholder="Escribí una nota para este pedido..."
            value={nota}
            onChange={e => setNota(e.target.value)}
            maxLength={300}
          />
          <div className="text-[10px] text-mist text-right mt-1">{nota.length}/300</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary text-xs"
            disabled={saving}
            onClick={() => onSave(nota)}
          >
            {saving ? 'Guardando...' : '✓ Guardar nota'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal confirmar eliminar
function ModalEliminar({ pedido, onClose, onConfirm, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
        <div className="font-semibold text-ink">¿Eliminar pedido?</div>
        <div className="text-xs text-mist">
          Se eliminará <strong className="text-ink">{pedido.codigo}</strong>. Esta acción no se puede deshacer.
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

// ── Página principal
export default function PedidosPage() {
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const [filters, setFilters]       = useState({})
  const [search,  setSearch]        = useState('')
  const [modalNota,    setModalNota]    = useState(null)
  const [modalElim,    setModalElim]    = useState(null)
  const [seleccionados, setSeleccionados] = useState([]) // pedido_ids seleccionados
  const [modalImp,     setModalImp]     = useState(false)
  const [modalConfirmar, setModalConfirmar] = useState(null)

  const { data: pedidos = [], isLoading } = usePedidos(filters)

  // Guardar nota
  const { mutate: guardarNota, isPending: savingNota } = useMutation({
    mutationFn: ({ id, nota }) => api.patch(`/pedidos/${id}`, { nota }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); setModalNota(null) },
  })

  // Duplicar pedido — navega a NuevoPedido con datos precargados
  const duplicar = async (pedido) => {
    const res = await api.get(`/pedidos/${pedido.pedido_id}`)
    const completo = res?.data || res
    navigate('/pedidos/nuevo', {
      state: {
        duplicadoDe: pedido.codigo,
        proveedor_id: completo.proveedor_id,
        cliente_id:   completo.cliente_id || '',
        incoterm:     completo.incoterm,
        moneda:       completo.moneda,
        nota:         `Duplicado de ${pedido.codigo}`,
        lineas: (completo.lineas || []).map(l => ({
          producto_id: l.producto_id,
          cantidad:    Number(l.cantidad),
          precio_unit: Number(l.precio_unit),
          nota:        l.nota || '',
        })),
      }
    })
  }

  // Confirmar pedido
  const { mutate: confirmarPedido, isPending: confirmando } = useMutation({
    mutationFn: (id) => api.patch(`/pedidos/${id}`, { estado: 'confirmado' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); setModalConfirmar(null) },
  })

  // Eliminar pedido
  const { mutate: eliminar, isPending: eliminando } = useMutation({
    mutationFn: (id) => api.delete(`/pedidos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); setModalElim(null) },
  })

  // ── Helpers de selección
  const toggleSeleccion = (id) =>
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleTodos = () => {
    const disponibles = filtered.filter(p => !p.importacion_id).map(p => p.pedido_id)
    setSeleccionados(prev =>
      prev.length === disponibles.length ? [] : disponibles
    )
  }

  const filtered = pedidos.filter(p =>
    !search ||
    p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    p.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar pedido..."
        filters={[{
          value: filters.estado ?? '',
          onChange: (value) => setFilters(c => ({ ...c, estado: value || undefined })),
          options: pedidoEstadoOptions.map(e => ({ value: e, label: estadoLabel(e) })),
          placeholder: 'Todos los estados',
        }]}
        createLabel="Nuevo pedido"
        onCreate={() => navigate('/pedidos/nuevo')}
      />

      <TableCard
        title="📋 Pedidos"
        countLabel={`${filtered.length} pedidos`}
        loading={isLoading}
        isEmpty={filtered.length === 0}
        emptyMessage="No hay pedidos que mostrar"
      >
        <TableContainer minWidth="min-w-[820px]">
          <thead>
            <tr>
              <th className="w-8 pl-3">
                <input
                  type="checkbox"
                  className="accent-tl w-3.5 h-3.5 cursor-pointer"
                  checked={seleccionados.length === filtered.length && filtered.length > 0}
                  onChange={toggleTodos}
                />
              </th>
              <th>Pedido</th>
              <th>Proveedor</th>
              <th>Incoterm</th>
              <th>Estado</th>
              <th>Prox. hito</th>
              <th>Moneda</th>
              <th>Líneas</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((pedido) => {
              const hito     = pedido.hitos?.[0]
              const semaforo = hito ? getSemaforo(hito.fecha_plan) : 'green'

              return (
                <tr
                  key={pedido.pedido_id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/pedidos/${pedido.pedido_id}`)}
                >
                  <td className="pl-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-tl w-3.5 h-3.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        checked={seleccionados.includes(pedido.pedido_id)}
                        onChange={() => toggleSeleccion(pedido.pedido_id)}
                        disabled={!!pedido.importacion_id}
                        title={pedido.importacion_id ? 'Este pedido ya está en una importación' : ''}
                      />
                      <span className={`s3 ${semaforoClass(semaforo)}`} />
                    </div>
                  </td>
                  <td>
                    <strong className="text-xs">{pedido.codigo}</strong>
                    {pedido.importacion_id && (
                      <div className="text-[10px] text-tl font-medium">🚢 En importación</div>
                    )}
                    {pedido.nota && (
                      <div className="text-[10px] text-mist truncate max-w-[160px]" title={pedido.nota}>
                        📝 {pedido.nota}
                      </div>
                    )}
                    {pedido.codigo_padre && (
                      <div className="text-[10px] text-tl">{pedido.codigo_padre}</div>
                    )}
                  </td>
                  <td>
                    <span className="ic">
                      {pedido.proveedor?.pais?.bandera} {pedido.proveedor?.nombre}
                    </span>
                  </td>
                  <td><span className="incb">{pedido.incoterm}</span></td>
                  <td>
                    <span className={`pill ${estadoPillClass(pedido.estado)}`}>
                      {estadoLabel(pedido.estado)}
                    </span>
                  </td>
                  <td className="text-[11px]">
                    {hito ? (
                      <span className={
                        semaforo === 'red'    ? 'text-rs font-medium' :
                        semaforo === 'yellow' ? 'text-am font-medium' : 'text-mist'
                      }>
                        {fmtDate(hito.fecha_plan)}
                      </span>
                    ) : (
                      <span className="text-mist">-</span>
                    )}
                  </td>
                  <td className="font-medium text-xs">{pedido.moneda}</td>
                  <td className="text-mist text-xs">{pedido._count?.lineas}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <AccionesMenu
                      pedido={pedido}
                      onAgregarNota={setModalNota}
                      onDuplicar={duplicar}
                      onEliminar={setModalElim}
                      onConfirmar={setModalConfirmar}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableContainer>
      </TableCard>

      {/* Modal nota */}
      {modalNota && (
        <ModalNota
          pedido={modalNota}
          saving={savingNota}
          onClose={() => setModalNota(null)}
          onSave={(nota) => guardarNota({ id: modalNota.pedido_id, nota })}
        />
      )}

      {/* ── Botón flotante de importación */}
      {seleccionados.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 fade-up">
          <div className="flex items-center gap-3 bg-ink text-white rounded-full px-5 py-3 shadow-xl">
            <span className="text-xs font-medium">
              {seleccionados.length} pedido{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
            </span>
            <div className="w-px h-4 bg-white/20" />
            <button
              className="text-xs font-semibold text-tl-l hover:text-white transition-colors"
              onClick={() => setSeleccionados([])}
            >
              Limpiar
            </button>
            <button
              className="bg-tl text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-tl-d transition-colors"
              onClick={() => setModalImp(true)}
            >
              🚢 Crear importación con {seleccionados.length} pedido{seleccionados.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal confirmar importación */}
      {modalImp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-card border border-border bg-sur shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="font-semibold text-ink">Nueva importación</div>
                <div className="text-xs text-mist">
                  {seleccionados.length === 1 ? 'Importación individual' : 'Importación consolidada'} · {seleccionados.length} pedido{seleccionados.length > 1 ? 's' : ''}
                </div>
              </div>
              <button className="text-mist hover:text-ink" onClick={() => setModalImp(false)}>✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                {filtered.filter(p => seleccionados.includes(p.pedido_id)).map(p => (
                  <div key={p.pedido_id} className="flex items-center justify-between rounded-card border border-tl/20 bg-tl-xl px-3 py-2">
                    <div>
                      <div className="text-xs font-medium">{p.codigo}</div>
                      <div className="text-[10px] text-mist">{p.proveedor?.nombre} · {p._count?.lineas} líneas</div>
                    </div>
                    <span className={`pill ${estadoPillClass(p.estado)}`}>{estadoLabel(p.estado)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button className="btn btn-outline text-xs" onClick={() => setModalImp(false)}>Cancelar</button>
              <button
                className="btn btn-primary text-xs"
                onClick={async () => {
                  // Validar que ninguno tenga importación asignada
                  const conImp = filtered.filter(p => seleccionados.includes(p.pedido_id) && p.importacion_id)
                  if (conImp.length > 0) {
                    alert(`Los siguientes pedidos ya están en una importación: ${conImp.map(p => p.codigo).join(', ')}`)
                    return
                  }
                  try {
                    await api.post('/pedidos/unir', { pedido_ids: seleccionados })
                    setSeleccionados([])
                    setModalImp(false)
                    qc.invalidateQueries({ queryKey: ['pedidos'] })
                    qc.invalidateQueries({ queryKey: ['importaciones'] })
                  } catch (e) {
                    alert(e?.message || 'Error al crear la importación')
                  }
                }}
              >
                ✓ Confirmar importación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar pedido */}
      {modalConfirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-sur shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <div className="font-semibold text-ink">Confirmar pedido</div>
            </div>
            <div className="text-xs text-mist leading-relaxed">
              Vas a confirmar el pedido <strong className="text-ink">{modalConfirmar.codigo}</strong>.
            </div>
            <div className="rounded-card border border-am/30 bg-yellow-50 px-3 py-2.5 space-y-1">
              <div className="text-[11px] font-semibold text-am">⚠️ Acción importante</div>
              <div className="text-[10px] text-am/80 leading-relaxed">
                Una vez confirmado, el pedido <strong>no podrá ser editado</strong>. Verificá que todos los datos y líneas sean correctos antes de continuar.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline text-xs" onClick={() => setModalConfirmar(null)}>Cancelar</button>
              <button
                className="btn btn-primary text-xs"
                disabled={confirmando}
                onClick={() => confirmarPedido(modalConfirmar.pedido_id)}
              >
                {confirmando ? 'Confirmando...' : '✅ Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {modalElim && (
        <ModalEliminar
          pedido={modalElim}
          saving={eliminando}
          onClose={() => setModalElim(null)}
          onConfirm={() => eliminar(modalElim.pedido_id)}
        />
      )}
    </div>
  )
}
