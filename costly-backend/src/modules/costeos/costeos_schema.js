// ============================================================
// src/modules/costeos/costeos.schema.js
// ============================================================
import { z } from 'zod'

const costeoFields = {
  importacion_id:  z.number().int().positive().optional(),
  importacion_ids: z.array(z.number().int().positive()).min(1).optional(),
  flete_maritimo:  z.coerce.number().min(0).optional(),
  seguro:          z.number().min(0).optional(),
  arancel_pct:     z.coerce.number().min(0).optional(),
  arancel_monto:   z.coerce.number().min(0).optional(),
  isc_pct:         z.number().min(0).max(100).optional(),
  agente_aduana:   z.coerce.number().min(0).optional(),
  flete_cr:        z.number().min(0).optional(),
  bodega_costo:    z.number().min(0).optional(),
  otros_costos:    z.number().min(0).optional(),
  tc_usd_crc:      z.number().positive().optional(),
  margen_global:   z.coerce.number().min(0).max(100).optional(),
}

const aproximacionFields = {
  pedido_ids:       z.array(z.number().int().positive()).min(1),
  flete_maritimo:   z.coerce.number().min(0).optional(),
  flete_es_pct:     z.boolean().optional(),
  seguro:           z.number().min(0).optional(),
  seguro_es_pct:    z.boolean().optional(),
  arancel_pct:      z.number().min(0).max(100).optional(),
  isc_pct:          z.number().min(0).max(100).optional(),
  agente_aduana:    z.number().min(0).optional(),
  agente_es_pct:    z.boolean().optional(),
  flete_cr:         z.number().min(0).optional(),
  flete_cr_es_pct:  z.boolean().optional(),
  bodega_costo:     z.number().min(0).optional(),
  bodega_es_pct:    z.boolean().optional(),
  otros_costos:     z.number().min(0).optional(),
  otros_es_pct:     z.boolean().optional(),
  tc_usd_crc:       z.number().positive().optional(),
  margen_global:    z.number().min(0).max(100).optional(),
}

export const createAproximacionSchema = z.object({ body: z.object(aproximacionFields) })

export const createCosteoSchema = z.object({
  body: z.object(costeoFields).refine(
    d => d.importacion_id || d.importacion_ids?.length,
    { message: 'Se requiere al menos una importación (importacion_id o importacion_ids)' }
  )
})

export const updateCosteoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    flete_maritimo: costeoFields.flete_maritimo,
    seguro:         costeoFields.seguro,
    arancel_pct:    costeoFields.arancel_pct,
    isc_pct:        costeoFields.isc_pct,
    agente_aduana:  costeoFields.agente_aduana,
    flete_cr:       costeoFields.flete_cr,
    bodega_costo:   costeoFields.bodega_costo,
    otros_costos:   costeoFields.otros_costos,
    tc_usd_crc:     costeoFields.tc_usd_crc,
    margen_global:  costeoFields.margen_global,
    importacion_ids: costeoFields.importacion_ids,
  }),
})
