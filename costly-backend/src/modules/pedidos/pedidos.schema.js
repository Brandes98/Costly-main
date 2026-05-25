// ============================================================
// src/modules/pedidos/pedidos.schema.js
// ============================================================
import { z } from 'zod'

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']
const ESTADOS = ['borrador', 'confirmado', 'en_produccion', 'listo_fabrica', 'embarcado', 'en_transito', 'en_puerto_cr', 'en_aduana', 'en_bodega', 'entregado', 'cerrado', 'cancelado']

export const createPedidoSchema = z.object({
  body: z.object({
    proveedor_id: z.number().int().positive(),
    cliente_id: z.number().int().positive().optional(),
    fecha_pedido: z.string().datetime(),
    incoterm: z.enum(INCOTERMS),
    moneda: z.string().length(3),
    forma_pago: z.string().optional(),
    lineas: z.array(z.object({
      producto_id: z.number().int().positive(),
      cantidad: z.number().positive(),
      precio_unit: z.number().positive(),
      nota: z.string().max(200).optional(),
    })).min(1, 'Debe tener al menos una línea'),
  })
})

export const updatePedidoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    incoterm: z.enum(INCOTERMS).optional(),
    moneda: z.string().length(3).optional(),
    cliente_id: z.number().int().positive().optional(),
  })
})

export const unirPedidosSchema = z.object({
  body: z.object({
    pedido_ids: z.array(z.number().int().positive()).min(1, 'Se necesita al menos 1 pedido'),
    nota: z.string().max(500).optional(),
  })
})

export const separarPedidoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    linea_ids: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos una línea'),
    nota: z.string().max(500).optional(),
  })
})
