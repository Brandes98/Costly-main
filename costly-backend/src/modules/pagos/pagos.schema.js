// ── pagos.schema.js
import { z } from 'zod'

export const createPagoSchema = z.object({
  body: z.object({
    pedido_id: z.number().int().positive(),
    proveedor_id: z.number().int().positive(),
    tipo: z.enum(['senal', 'saldo', 'total', 'anticipo', 'devolucion']),
    monto: z.number().positive(),
    moneda: z.string().length(3),
    tc_usado: z.number().positive().optional(),
    fecha_pago: z.string().datetime(),
    fecha_limite: z.string().datetime().optional(),
    metodo: z.enum(['swift', 'transferencia_local', 'cheque', 'efectivo']).optional(),
    referencia: z.string().max(100).optional(),
    comprobante_url: z.string().url().optional(),
  })
})