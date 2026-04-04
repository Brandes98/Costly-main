import { useMemo, useState } from 'react'
import Spinner, { EmptyState } from '../../components/ui/Spinner'
import { useImportaciones } from '../../hooks/useApi'
import { fmtDate } from '../../lib/utils'

const estadoLabel = {
  borrador: 'Borrador',
  en_proceso: 'En proceso',
  en_transito: 'En tránsito',
  en_aduana: 'En aduana',
  en_bodega: 'En bodega',
  cerrada: 'Cerrada',
}

const estadoPill = {
  borrador: 'pill-gray',
  en_proceso: 'pill-blue',
  en_transito: 'pill-blue',
  en_aduana: 'pill-yellow',
  en_bodega: 'pill-green',
  cerrada: 'pill-violet',
}

const semaforoByEstado = {
  borrador: 's3y',
  en_proceso: 's3y',
  en_transito: 's3r',
  en_aduana: 's3y',
  en_bodega: 's3g',
  cerrada: 's3g',
}

function resumenPedidos(pedidos = []) {
  return pedidos.map((pedido) => pedido.codigo).join(' + ')
}

function resumenProveedores(pedidos = []) {
  return [...new Set(pedidos.map((pedido) => pedido.proveedor?.nombre).filter(Boolean))]
}

export default function ImportacionesPage() {
  const [estado, setEstado] = useState('')
  const { data: importaciones = [], isLoading, isError } = useImportaciones({
    estado: estado || undefined,
  })

  const rows = useMemo(
    () =>
      importaciones.map((importacion) => {
        const proveedores = resumenProveedores(importacion.pedidos)
        return {
          ...importacion,
          proveedores,
          pedidosResumen: resumenPedidos(importacion.pedidos),
          pedidosCount: importacion._count?.pedidos ?? importacion.pedidos?.length ?? 0,
          costeoEstado: importacion._count?.costeos > 0 ? 'Registrado' : 'Pendiente',
        }
      }),
    [importaciones]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex items-start justify-between gap-3 w-full">
        <div>
          <div className="font-serif text-xl font-medium text-ink">Importaciones</div>
          <div className="text-[11px] text-mist">Operaciones / Importaciones</div>
        </div>
        <div className="flex gap-2">
          <select
            className="form-input h-8 min-w-40"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="en_proceso">En proceso</option>
            <option value="en_transito">En tránsito</option>
            <option value="en_aduana">En aduana</option>
            <option value="en_bodega">En bodega</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-card border border-rs/20 bg-rs-l px-4 py-3 text-xs text-rs">
          No pudimos cargar las importaciones del backend.
        </div>
      )}

      <div className="card w-full min-w-0">
        <div className="card-header">
          <div className="card-title">Importaciones consolidadas</div>
          <span className="text-[11.5px] text-mist">{rows.length} importaciones activas</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="🚢"
            title="No hay importaciones para mostrar"
            description="Cuando consolides pedidos en el backend, aparecerán acá."
          />
        ) : (
          <div className="w-full overflow-x-auto custom-scroll">
            <table className="tbl min-w-[920px]">
              <thead>
                <tr>
                  <th className="w-6" />
                  <th>Código</th>
                  <th>Pedidos agrupados</th>
                  <th>Pedidos</th>
                  <th>Contenedor</th>
                  <th>Estado</th>
                  <th>Fecha unión</th>
                  <th>Costeo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.importacion_id}>
                    <td className="pl-3">
                      <span className={`s3 ${semaforoByEstado[item.estado] || 's3y'}`} />
                    </td>
                    <td>
                      <strong>{item.codigo}</strong>
                      <div className="text-[10px] text-tl">{item.pedidosResumen || 'Sin pedidos'}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {item.proveedores.length > 0 ? (
                          item.proveedores.map((proveedor) => (
                            <span key={`${item.importacion_id}-${proveedor}`} className="ic">
                              {proveedor}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-mist">Sin proveedor</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center font-semibold">{item.pedidosCount}</td>
                    <td className="text-[11px] text-mist">Pendiente</td>
                    <td>
                      <span className={`pill ${estadoPill[item.estado] || 'pill-gray'}`}>
                        {estadoLabel[item.estado] || item.estado}
                      </span>
                    </td>
                    <td className="text-[11px] text-mist">{fmtDate(item.fecha_union || item.creado_en)}</td>
                    <td>
                      <span
                        className={`pill ${item.costeoEstado === 'Registrado' ? 'pill-green' : 'pill-yellow'}`}
                      >
                        {item.costeoEstado}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline text-xs whitespace-nowrap">Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
