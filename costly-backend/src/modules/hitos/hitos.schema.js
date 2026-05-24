// ============================================================
// src/modules/hitos/hitos.schema.js
// ============================================================
import { z } from 'zod'

export const createHitoSchema = z.object({
  body: z.object({
    pedido_id: z.number().int().positive(),
    responsable_id: z.number().int().positive().optional(),
    tipo: z.enum(['confirmacion', 'pago_senal', 'produccion', 'embarque', 'llegada_cr', 'retiro_aduana', 'entrega_bodega', 'entrega_cliente', 'personalizado']),
    fecha_plan: z.string().optional(),
    nota: z.string().optional(),
  })
})

export const updateHitoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    estado: z.enum(['pendiente', 'en_proceso', 'completado', 'vencido']).optional(),
    fecha_plan: z.string().optional(),
    fecha_real: z.string().optional(),
    nota: z.string().optional(),
    responsable_id: z.number().int().positive().optional(),
  })
})