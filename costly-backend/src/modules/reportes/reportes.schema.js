import { z } from 'zod'

const TIPOS_REPORTE = ['r01','r02','r03','r04','r05','r06','r07','r08','r09','r10','r11','r12','dinamico','pedidos','importaciones','costeos','seguimiento','proveedores','productos','clientes','merge','pagos']

export const generarReporteSchema = z.object({
  body: z.object({
    tipo:   z.enum(TIPOS_REPORTE),
    config: z.object({}).passthrough().optional(),
  })
})

export const saveReporteSchema = z.object({
  body: z.object({
    nombre:      z.string().min(2).max(120),
    tipo:        z.enum(TIPOS_REPORTE),
    config_json: z.object({}).passthrough().optional(),
    publico:     z.boolean().optional(),
  })
})
