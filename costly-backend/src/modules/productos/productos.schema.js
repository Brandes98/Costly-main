import { z } from 'zod'

const productoBase = z.object({
  sku: z.string().min(1).max(50),
  nombre: z.string().min(2).max(150),
  descripcion: z.string().optional(),
  categoria: z.string().max(80).optional(),
  cod_arancelario: z.string().max(20).optional(),
  arancel_pct: z.number().min(0).max(100).optional(),
  isc_pct: z.number().min(0).max(100).optional(),
  peso_kg: z.number().positive().optional(),
  largo_cm: z.number().positive().optional(),
  ancho_cm: z.number().positive().optional(),
  alto_cm: z.number().positive().optional(),
  volumen_m3: z.number().positive().optional(),
  modo_volumen: z.enum(['unitario', 'por_caja', 'sin_volumen']).default('unitario'),
  unidades_por_caja: z.number().int().positive().optional(),
  peso_caja_kg: z.number().positive().optional(),
  volumen_caja_m3: z.number().positive().optional(),
  tipo_estiba: z.enum(['pallet_americano', 'pallet_europeo', 'pallet_medida', 'sin_pallet', 'otro']).optional(),
  pallet_largo_cm: z.number().positive().optional(),
  pallet_ancho_cm: z.number().positive().optional(),
  pallet_alto_max_cm: z.number().positive().optional(),
  pallet_peso_max_kg: z.number().positive().optional(),
  nota_estiba: z.string().optional(),
  requiere_permiso: z.boolean().optional(),
  permiso_tipo: z.string().max(80).optional(),
})

export const createProductoSchema = z.object({ body: productoBase })
export const updateProductoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: productoBase.partial(),
})
