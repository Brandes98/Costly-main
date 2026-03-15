// ── documentos.schema.js
import { z } from 'zod'

export const createDocumentoSchema = z.object({
  body: z.object({
    entidad_tipo: z.string().max(40),
    entidad_id: z.number().int().positive(),
    tipo_doc: z.enum(['factura', 'bl', 'dua', 'permiso', 'seguro', 'packing', 'otro']),
    nombre: z.string().min(1).max(200),
    url: z.string().url().max(500),
    tamanio_kb: z.number().int().positive().optional(),
    mime_type: z.string().max(80).optional(),
  })
})
