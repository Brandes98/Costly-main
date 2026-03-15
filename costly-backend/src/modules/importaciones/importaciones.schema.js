// ============================================================
// src/modules/importaciones/importaciones.schema.js
// ============================================================
import { z } from 'zod'

export const updateImportacionSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    descripcion: z.string().max(200).optional(),
    estado: z.enum(['borrador', 'en_proceso', 'en_transito', 'en_aduana', 'en_bodega', 'cerrada']).optional(),
  })
})
