// ============================================================
// src/components/ui/ImportarExcelModal.jsx
// ============================================================
import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'

export default function ImportarExcelModal({ entidad, queryKey, onClose }) {
  const qc         = useQueryClient()
  const inputRef   = useRef()
  const [archivo,  setArchivo]  = useState(null)
  const [resultado, setResultado] = useState(null)

  const LABELS = {
    proveedores: { titulo: 'Importar proveedores', icon: '🏭' },
    clientes:    { titulo: 'Importar clientes',    icon: '🧑‍💼' },
    productos:   { titulo: 'Importar productos',   icon: '📦' },
  }

  const { mutate: importar, isPending } = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('archivo', file)
      return api.post(`/import/${entidad}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: (res) => {
      const r = res?.data || res
      setResultado(r)
      qc.invalidateQueries({ queryKey: [queryKey] })
    },
    onError: (e) => setResultado({ error: e?.message || 'Error al importar' }),
  })

  const descargarPlantilla = async () => {
    try {
      const res = await api.get(`/import/plantilla/${entidad}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data || res]))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `plantilla_${entidad}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error descargando plantilla:', e)
    }
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setArchivo(f); setResultado(null) }
  }

  const handleImportar = () => {
    if (archivo) importar(archivo)
  }

  const { titulo, icon } = LABELS[entidad] || { titulo: 'Importar', icon: '📥' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-card border border-border bg-sur shadow-xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-xs text-ink">{icon} {titulo}</div>
            <div className="text-[10px] text-mist">Subí un Excel con el formato de la plantilla</div>
          </div>
          <button className="text-mist hover:text-ink" onClick={onClose}>✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Paso 1 — Descargar plantilla */}
          <div className="rounded-card border border-tl/20 bg-tl-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-tl">① Descargá la plantilla</div>
            <div className="text-[10px] text-mist">
              La plantilla tiene las columnas requeridas con un ejemplo de referencia.
              Los campos con * son obligatorios.
            </div>
            <button className="btn btn-outline text-xs w-full" onClick={descargarPlantilla}>
              📥 Descargar plantilla Excel
            </button>
          </div>

          {/* Paso 2 — Subir archivo */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-ink">② Subí el archivo completado</div>
            <label className="flex items-center gap-3 cursor-pointer rounded-card border-2 border-dashed border-border bg-sur2 px-4 py-3 hover:border-tl/40 transition-colors">
              <span className="text-2xl">📄</span>
              <div>
                <div className="text-xs font-medium text-ink">
                  {archivo ? archivo.name : 'Seleccionar archivo Excel...'}
                </div>
                <div className="text-[10px] text-mist">
                  {archivo ? `${(archivo.size / 1024).toFixed(1)} KB` : '.xlsx — máx. 5MB'}
                </div>
              </div>
              <input ref={inputRef} type="file" className="hidden"
                accept=".xlsx,.xls" onChange={handleFile} />
            </label>
          </div>

          {/* Resultado */}
          {resultado && !resultado.error && (
            <div className="rounded-card border border-sg/20 bg-sg-l p-3 space-y-1">
              <div className="text-xs font-semibold text-sg">
                ✅ Importación completada — {resultado.creados} registro{resultado.creados !== 1 ? 's' : ''} creado{resultado.creados !== 1 ? 's' : ''}
              </div>
              {resultado.errores?.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  <div className="text-[10px] font-semibold text-am">⚠️ {resultado.errores.length} advertencia{resultado.errores.length > 1 ? 's' : ''}:</div>
                  {resultado.errores.map((e, i) => (
                    <div key={i} className="text-[10px] text-am">• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {resultado?.error && (
            <div className="rounded-card border border-rs/20 bg-rs-l px-3 py-2 text-xs text-rs">
              ❌ {resultado.error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button className="btn btn-outline text-xs" onClick={onClose}>
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado && (
            <button className="btn btn-primary text-xs"
              disabled={!archivo || isPending}
              onClick={handleImportar}>
              {isPending ? 'Importando...' : '📥 Importar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
