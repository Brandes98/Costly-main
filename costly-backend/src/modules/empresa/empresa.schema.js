// ============================================================
// src/modules/empresa/empresa.schema.js
// ============================================================
import { z } from 'zod'

export const updateEmpresaSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).max(150).optional(),
    ruc: z.string().max(20).optional(),
    moneda_base: z.string().length(3).optional(),

    iva_pct: z.coerce.number().min(0).max(100).optional(),
    ivi_pct: z.coerce.number().min(0).max(100).optional(),
    margen_default: z.coerce.number().min(0).max(100).optional(),
    tc_fuente: z.enum(['bccr', 'manual', 'hacienda']).optional(),

    telefono: z.string().max(20).optional(),
    email: z.string().email().optional(),
    direccion: z.string().max(300).optional(),
    logo_url: z.string().url().optional(),
  })
})
