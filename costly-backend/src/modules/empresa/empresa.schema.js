// ============================================================
// src/modules/empresa/empresa.schema.js
// ============================================================
import { z } from 'zod'

export const updateEmpresaSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).max(150).optional(),
    cedula_juridica: z.string().max(20).optional(),
    telefono: z.string().max(20).optional(),
    email: z.string().email().optional(),
    direccion: z.string().max(300).optional(),
    moneda_base: z.string().length(3).optional(),
    logo_url: z.string().url().optional(),
  })
})
