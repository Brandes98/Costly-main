// ============================================================
// src/modules/auth/auth.schema.js
// ============================================================
import { z } from 'zod'

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })
})

export const changePasswordSchema = z.object({
  body: z.object({
    password_actual: z.string().min(6),
    password_nuevo:  z.string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
  })
})
