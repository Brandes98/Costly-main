
// ============================================================
// src/modules/usuarios/usuarios.schema.js
// ============================================================
import { z } from 'zod'

export const createUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).max(100),
    email: z.string().email(),
    rol: z.enum(['admin', 'operador_sr', 'operador', 'finanzas', 'consultas']),
    password_temporal: z.string().min(8).optional(),
  })
})

export const updateUsuarioSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    nombre: z.string().min(2).max(100).optional(),
    rol: z.enum(['admin', 'operador_sr', 'operador', 'finanzas', 'consultas']).optional(),
  })
})
