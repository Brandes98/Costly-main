import { z } from 'zod'

export const upsertTramiteSchema = z.object({
  params: z.object({ importacion_id: z.string().regex(/^\d+$/) }),
  body: z.object({
    agente_id: z.number().int().positive().optional(),
    dua_numero: z.string().max(40).optional(),
    tc_hacienda: z.number().positive().optional(),
    fecha_dua: z.string().datetime().optional(),
    almacen_fiscal: z.string().max(120).optional(),
    valor_cif_cr: z.number().positive().optional(),
    total_tributos: z.number().positive().optional(),
    estado: z.enum(['pendiente', 'en_proceso', 'aprobado', 'objetado']).optional(),
  }),
})
