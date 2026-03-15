// ============================================================
// src/modules/costeos/costeos.schema.js
// ============================================================
import { z } from 'zod'

export const createCosteoSchema = z.object({
  body: z.object({
    importacion_id: z.number().int().positive(),
    flete_maritimo: z.number().positive().optional(),
    seguro: z.number().positive().optional(),
    arancel_pct: z.number().min(0).max(100).optional(),
    isc_pct: z.number().min(0).max(100).optional(),
    agente_aduana: z.number().positive().optional(),
    flete_cr: z.number().positive().optional(),
    bodega_costo: z.number().positive().optional(),
    otros_costos: z.number().positive().optional(),
    tc_usd_crc: z.number().positive().optional(),
    margen_global: z.number().min(0).max(100).optional(),
  })
})

export const updateCosteoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: createCosteoSchema.shape.body.omit({ importacion_id: true }).partial(),
})
