import { z } from 'zod'

export const createTCSchema = z.object({
  body: z.object({
    fecha: z.string().datetime(),
    usd_crc: z.number().positive(),
    eur_crc: z.number().positive().optional(),
    eur_usd: z.number().positive().optional(),
    fuente: z.enum(['bccr', 'manual', 'hacienda']).default('manual'),
  }),
})

