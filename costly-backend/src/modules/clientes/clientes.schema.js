import { z } from 'zod'

export const createClienteSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).max(150),
    cedula: z.string().max(20).optional(),
    tipo: z.enum(['nacional', 'exportacion', 'interno']),
    moneda: z.string().length(3),
    descuento_pct: z.number().min(0).max(100).optional(),
    email: z.string().email().optional(),
  })
})

export const updateClienteSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    nombre: z.string().min(2).max(150).optional(),
    tipo: z.enum(['nacional', 'exportacion', 'interno']).optional(),
    moneda: z.string().length(3).optional(),
    descuento_pct: z.number().min(0).max(100).optional(),
    email: z.string().email().optional(),
  })
})
