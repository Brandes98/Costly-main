import { z } from 'zod'

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']

export const createProveedorSchema = z.object({
  body: z.object({
    pais_id: z.number().int().positive(),
    nombre: z.string().min(2).max(150),
    ciudad: z.string().max(100).optional(),
    incoterm_pref: z.enum(INCOTERMS).optional(),
    moneda: z.string().length(3),
    dias_transito: z.number().int().positive().optional(),
    puerto_origen: z.string().max(80).optional(),
    condiciones_pago: z.string().max(100).optional(),
    contacto: z.string().max(100).optional(),
    email: z.string().email().optional(),
  })
})

export const updateProveedorSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    nombre: z.string().min(2).max(150).optional(),
    ciudad: z.string().max(100).optional(),
    incoterm_pref: z.enum(INCOTERMS).optional(),
    moneda: z.string().length(3).optional(),
    dias_transito: z.number().int().positive().optional(),
    puerto_origen: z.string().max(80).optional(),
    condiciones_pago: z.string().max(100).optional(),
    contacto: z.string().max(100).optional(),
    email: z.string().email().optional(),
  })
})
