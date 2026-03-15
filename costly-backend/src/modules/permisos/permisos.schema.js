import { z } from 'zod'
 
export const createPermisoSchema = z.object({
  body: z.object({
    pedido_id:        z.number().int().positive(),
    producto_id:      z.number().int().positive().optional(),
    tipo:             z.enum(['minae', 'senasa', 'minsa', 'sutel', 'otro']),
    numero:           z.string().max(60).optional(),
    fecha_solicitud:  z.string().datetime().optional(),
    url_documento:    z.string().url().optional(),
    nota:             z.string().optional(),
  })
})
 
export const updatePermisoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    estado:            z.enum(['pendiente', 'en_tramite', 'aprobado', 'rechazado', 'vencido']).optional(),
    numero:            z.string().max(60).optional(),
    fecha_aprobacion:  z.string().datetime().optional(),
    fecha_vencimiento: z.string().datetime().optional(),
    url_documento:     z.string().url().optional(),
    nota:              z.string().optional(),
  })
})