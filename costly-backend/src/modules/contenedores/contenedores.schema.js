// ── contenedores.schema.js
import { z } from 'zod'

export const createContenedorSchema = z.object({
  body: z.object({
    importacion_id: z.number().int().positive(),
    codigo: z.string().min(1).max(20),
    tipo: z.enum(['GP20', 'GP40', 'HC40', 'LCL', 'aereo']).optional(),
    naviera: z.string().max(80).optional(),
    bl_numero: z.string().max(60).optional(),
    puerto_origen: z.string().max(80).optional(),
    puerto_destino: z.string().max(80).optional(),
    fecha_salida: z.string().datetime().optional(),
    eta_cr: z.string().datetime().optional(),
  })
})

export const updateContenedorSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: createContenedorSchema.shape.body.omit({ importacion_id: true }).partial().extend({
    estado: z.enum(['programado', 'pre_embarque', 'en_transito', 'en_puerto', 'en_aduana', 'en_bodega', 'retirado']).optional(),
    fecha_arribo: z.string().datetime().optional(),
  })
})
