import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEmpresa, useUpdateEmpresa } from '../../hooks/useApi'
import Spinner from '../../components/ui/Spinner'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  ruc: z.string().max(20).optional().or(z.literal('')),

  moneda_base: z.string().length(3, 'Requerido'),
  iva_pct: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  ivi_pct: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  margen_default: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(0).max(100).optional()
  ),
  tc_fuente: z.enum(['bccr', 'manual', 'hacienda']).optional(),

  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  direccion: z.string().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
  logo_url: z.string().url('URL inválida').optional().or(z.literal('')),
})

const MONEDAS = ['USD', 'CRC', 'EUR']
const TC_FUENTES = [
  { value: 'bccr', label: 'BCCR' },
  { value: 'manual', label: 'Manual' },
  { value: 'hacienda', label: 'Hacienda' },
]

const emptyToUndefined = (value) => (value === '' || value == null ? undefined : value)

export default function EmpresaPage() {
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const successTimer = useRef(null)

  const { data: empresa, isLoading } = useEmpresa()
  const { mutate: guardar, isPending } = useUpdateEmpresa()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { moneda_base: 'USD', tc_fuente: 'bccr' },
  })

  useEffect(() => {
    if (!empresa) return
    reset({
      nombre: empresa.nombre ?? '',
      ruc: empresa.ruc ?? '',
      moneda_base: empresa.moneda_base ?? 'USD',
      iva_pct: empresa.iva_pct ?? 13,
      ivi_pct: empresa.ivi_pct ?? 13,
      margen_default: empresa.margen_default ?? '',
      tc_fuente: empresa.tc_fuente ?? 'bccr',
      email: empresa.email ?? '',
      telefono: empresa.telefono ?? '',
      direccion: empresa.direccion ?? '',
      logo_url: empresa.logo_url ?? '',
    })
  }, [empresa, reset])

  const onSubmit = (data) => {
    setError(null)
    setSuccess(null)
    const payload = {
      nombre: data.nombre,
      ruc: emptyToUndefined(data.ruc),
      moneda_base: data.moneda_base,
      iva_pct: data.iva_pct,
      ivi_pct: data.ivi_pct,
      margen_default: data.margen_default,
      tc_fuente: data.tc_fuente,
      email: emptyToUndefined(data.email),
      telefono: emptyToUndefined(data.telefono),
      direccion: emptyToUndefined(data.direccion),
      logo_url: emptyToUndefined(data.logo_url),
    }

    guardar(payload, {
      onSuccess: () => {
        reset(data)
        setSuccess('Se actualizó la empresa correctamente.')
      },
      onError: (err) => setError(err?.error?.message || 'No se pudo guardar'),
    })
  }

  useEffect(() => {
    if (!success) return
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = setTimeout(() => setSuccess(null), 3500)
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [success])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-serif text-xl font-medium text-ink">Datos de la Empresa</div>
          <div className="text-xs text-mist">Admin › Empresa</div>
        </div>
        <button
          className="btn btn-primary text-xs"
          onClick={handleSubmit(onSubmit)}
          disabled={isPending || !isDirty}
          title={!isDirty ? 'No hay cambios' : 'Guardar cambios'}
        >
          💾 Guardar cambios
        </button>
      </div>

      {error && (
        <div className="bg-rs-l text-rs text-xs px-3 py-2 rounded-lg border border-rs/20">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-sg-l text-sg text-xs px-3 py-2 rounded-lg border border-sg/20">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="card">
            <div className="card-header">
              <div className="card-title">🏢 Información general</div>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-group md:col-span-2">
                  <label className="form-label">Nombre / Razón social *</label>
                  <input {...register('nombre')} className="form-input" />
                  {errors.nombre && <span className="text-xs text-rs">{errors.nombre.message}</span>}
                </div>

                <div className="form-group md:col-span-2">
                  <label className="form-label">RUC / Cédula jurídica</label>
                  <input {...register('ruc')} className="form-input" placeholder="3-101-XXXXXX" />
                  {errors.ruc && <span className="text-xs text-rs">{errors.ruc.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label">Moneda base</label>
                  <select {...register('moneda_base')} className="form-input">
                    {MONEDAS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {errors.moneda_base && (
                    <span className="text-xs text-rs">{errors.moneda_base.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">IVA %</label>
                  <input {...register('iva_pct')} className="form-input" type="number" step="0.01" />
                  {errors.iva_pct && <span className="text-xs text-rs">{errors.iva_pct.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">IVI %</label>
                  <input {...register('ivi_pct')} className="form-input" type="number" step="0.01" />
                  {errors.ivi_pct && <span className="text-xs text-rs">{errors.ivi_pct.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Margen default %</label>
                  <input {...register('margen_default')} className="form-input" type="number" step="0.01" />
                  {errors.margen_default && (
                    <span className="text-xs text-rs">{errors.margen_default.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Fuente TC</label>
                  <select {...register('tc_fuente')} className="form-input">
                    {TC_FUENTES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.tc_fuente && (
                    <span className="text-xs text-rs">{errors.tc_fuente.message}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">📋 Información de contacto</div>
            </div>
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input {...register('email')} className="form-input" type="email" placeholder="info@empresa.com" />
                {errors.email && <span className="text-xs text-rs">{errors.email.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input {...register('telefono')} className="form-input" placeholder="+506 2222-3333" />
                {errors.telefono && <span className="text-xs text-rs">{errors.telefono.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input {...register('direccion')} className="form-input" placeholder="San José, Costa Rica" />
                {errors.direccion && <span className="text-xs text-rs">{errors.direccion.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Logo (URL)</label>
                <input {...register('logo_url')} className="form-input" placeholder="https://..." />
                {errors.logo_url && <span className="text-xs text-rs">{errors.logo_url.message}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
