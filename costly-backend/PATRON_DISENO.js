// ============================================================
// PATRON DE DISEÑO — Arquitectura en Capas
// Routes → Controller → Service → Utils/DB
// Ejemplo basado en el módulo de PEDIDOS
// ============================================================


// ============================================================
// 1. ROUTES — pedidos.routes.js
// Solo define rutas y aplica middlewares
// NO tiene lógica de negocio
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './pedidos.controller.js'
import { createPedidoSchema, updatePedidoSchema } from './pedidos.schema.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

// GET /api/pedidos — listar pedidos activos
router.get('/',
  authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'),
  controller.getAll
)

// GET /api/pedidos/:id — detalle de un pedido
router.get('/:id',
  authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'),
  controller.getById
)

// POST /api/pedidos — crear pedido
router.post('/',
  authorize('operador', 'operador_sr', 'admin'),
  validate(createPedidoSchema),
  auditLog('pedido', 'INSERT'),
  controller.create
)

// PATCH /api/pedidos/:id — actualizar pedido
router.patch('/:id',
  authorize('operador', 'operador_sr', 'admin'),
  validate(updatePedidoSchema),
  auditLog('pedido', 'UPDATE'),
  controller.update
)

// PATCH /api/pedidos/:id/estado — cambiar estado
router.patch('/:id/estado',
  authorize('operador', 'operador_sr', 'admin'),
  auditLog('pedido', 'UPDATE'),
  controller.updateEstado
)

// POST /api/pedidos/unir — unir pedidos
router.post('/unir',
  authorize('operador_sr', 'admin'),
  auditLog('pedido', 'UPDATE'),
  controller.unirPedidos
)

// POST /api/pedidos/:id/separar — separar líneas
router.post('/:id/separar',
  authorize('operador_sr', 'admin'),
  auditLog('pedido', 'UPDATE'),
  controller.separarPedido
)

// DELETE /api/pedidos/:id — cancelar pedido
router.delete('/:id',
  authorize('admin'),
  auditLog('pedido', 'DELETE'),
  controller.cancel
)

export default router


// ============================================================
// 2. CONTROLLER — pedidos.controller.js
// Recibe el request, llama al service, devuelve la response
// NO tiene lógica de negocio ni consultas a DB
// ============================================================
import * as service from './pedidos.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    const { empresa_id } = req.user  // viene del JWT
    const filters = req.query        // estado, proveedor_id, etc.
    const pedidos = await service.getAll(empresa_id, filters)
    return successResponse(res, pedidos)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const getById = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const { id } = req.params
    const pedido = await service.getById(empresa_id, parseInt(id))
    return successResponse(res, pedido)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const create = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    const data = req.body
    const pedido = await service.create(empresa_id, usuario_id, data)
    return successResponse(res, pedido, 201)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const update = async (req, res) => {
  try {
    const { empresa_id } = req.user
    const { id } = req.params
    const data = req.body
    const pedido = await service.update(empresa_id, parseInt(id), data)
    return successResponse(res, pedido)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const updateEstado = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    const { id } = req.params
    const { estado } = req.body
    const pedido = await service.updateEstado(empresa_id, parseInt(id), estado, usuario_id)
    return successResponse(res, pedido)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const unirPedidos = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    const { pedido_ids, nota } = req.body
    const importacion = await service.unirPedidos(empresa_id, usuario_id, pedido_ids, nota)
    return successResponse(res, importacion, 201)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const separarPedido = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    const { id } = req.params
    const { linea_ids, nota } = req.body
    const subpedidos = await service.separarPedido(empresa_id, usuario_id, parseInt(id), linea_ids, nota)
    return successResponse(res, subpedidos, 201)
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const cancel = async (req, res) => {
  try {
    const { empresa_id, usuario_id } = req.user
    const { id } = req.params
    const { motivo } = req.body
    await service.cancel(empresa_id, usuario_id, parseInt(id), motivo)
    return successResponse(res, { message: 'Pedido cancelado correctamente' })
  } catch (error) {
    return errorResponse(res, error)
  }
}


// ============================================================
// 3. SERVICE — pedidos.service.js
// Toda la lógica de negocio vive acá
// Valida reglas, coordina con DB y utils
// ============================================================
import prisma from '../../config/database.js'
import { generarCodigoPedido } from '../../utils/codigo.utils.js'
import { AppError } from '../../utils/response.utils.js'

export const getAll = async (empresa_id, filters = {}) => {
  const where = {
    empresa_id,
    // Filtros opcionales
    ...(filters.estado && { estado: filters.estado }),
    ...(filters.proveedor_id && { proveedor_id: parseInt(filters.proveedor_id) }),
    ...(filters.cliente_id && { cliente_id: parseInt(filters.cliente_id) }),
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      proveedor: { select: { nombre: true, pais: { select: { bandera: true, nombre: true } } } },
      cliente: { select: { nombre: true } },
      hitos: {
        where: { estado: { in: ['pendiente', 'en_proceso'] } },
        orderBy: { fecha_plan: 'asc' },
        take: 1,  // solo el próximo hito
      },
      _count: { select: { lineas: true } },
    },
    orderBy: { creado_en: 'desc' },
  })

  return pedidos
}

export const getById = async (empresa_id, pedido_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: {
      proveedor: true,
      cliente: true,
      lineas: { include: { producto: true } },
      facturas: true,
      hitos: { orderBy: { fecha_plan: 'asc' } },
      pagos: true,
      permisos: true,
      proyeccion: { include: { detalle: true } },
    },
  })

  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  return pedido
}

export const create = async (empresa_id, usuario_id, data) => {
  const codigo = await generarCodigoPedido(empresa_id)

  const pedido = await prisma.pedido.create({
    data: {
      empresa_id,
      creado_por: usuario_id,
      codigo,
      proveedor_id: data.proveedor_id,
      cliente_id: data.cliente_id,
      fecha_pedido: new Date(data.fecha_pedido),
      incoterm: data.incoterm,
      moneda: data.moneda,
      estado: 'borrador',
      lineas: {
        create: data.lineas.map((linea, index) => ({
          producto_id: linea.producto_id,
          numero: index + 1,
          cantidad: linea.cantidad,
          precio_unit: linea.precio_unit,
          total_linea: linea.cantidad * linea.precio_unit,
          nota: linea.nota,
        })),
      },
    },
    include: { lineas: { include: { producto: true } } },
  })

  return pedido
}

export const update = async (empresa_id, pedido_id, data) => {
  // Verificar que el pedido existe y pertenece a la empresa
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  // No permitir editar pedidos cancelados o cerrados
  if (['cancelado', 'cerrado'].includes(pedido.estado)) {
    throw new AppError('No se puede editar un pedido cancelado o cerrado', 400, 'PEDIDO_LOCKED')
  }

  return await prisma.pedido.update({
    where: { pedido_id },
    data: {
      ...(data.incoterm && { incoterm: data.incoterm }),
      ...(data.moneda && { moneda: data.moneda }),
      ...(data.cliente_id && { cliente_id: data.cliente_id }),
    },
  })
}

export const updateEstado = async (empresa_id, pedido_id, nuevoEstado, usuario_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  // Validar transición de estado
  const transicionesValidas = {
    borrador: ['confirmado', 'cancelado'],
    confirmado: ['en_produccion', 'cancelado'],
    en_produccion: ['listo_fabrica', 'cancelado'],
    listo_fabrica: ['embarcado'],
    embarcado: ['en_transito'],
    en_transito: ['en_puerto_cr'],
    en_puerto_cr: ['en_aduana'],
    en_aduana: ['en_bodega'],
    en_bodega: ['entregado'],
    entregado: ['cerrado'],
  }

  const permitidos = transicionesValidas[pedido.estado] || []
  if (!permitidos.includes(nuevoEstado)) {
    throw new AppError(
      `No se puede cambiar de '${pedido.estado}' a '${nuevoEstado}'`,
      400,
      'ESTADO_INVALIDO'
    )
  }

  return await prisma.pedido.update({
    where: { pedido_id },
    data: { estado: nuevoEstado },
  })
}

export const unirPedidos = async (empresa_id, usuario_id, pedido_ids, nota) => {
  // Verificar que todos los pedidos existen y pertenecen a la empresa
  const pedidos = await prisma.pedido.findMany({
    where: { pedido_id: { in: pedido_ids }, empresa_id }
  })

  if (pedidos.length !== pedido_ids.length) {
    throw new AppError('Uno o más pedidos no encontrados', 404, 'PEDIDOS_NOT_FOUND')
  }

  // Verificar que ninguno ya esté consolidado
  const yaConsolidados = pedidos.filter(p => p.importacion_id !== null)
  if (yaConsolidados.length > 0) {
    throw new AppError(
      `Los pedidos ${yaConsolidados.map(p => p.codigo).join(', ')} ya están consolidados`,
      400,
      'PEDIDOS_YA_CONSOLIDADOS'
    )
  }

  // Crear importación y unir pedidos en una transacción
  const resultado = await prisma.$transaction(async (tx) => {
    // Generar código de importación
    const count = await tx.importacion.count({ where: { empresa_id } })
    const codigo = `IMP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

    // Crear la importación
    const importacion = await tx.importacion.create({
      data: {
        empresa_id,
        creado_por: usuario_id,
        codigo,
        consolidado: true,
        fecha_union: new Date(),
        estado: 'en_proceso',
      }
    })

    // Asignar importacion_id a cada pedido
    await tx.pedido.updateMany({
      where: { pedido_id: { in: pedido_ids } },
      data: { importacion_id: importacion.importacion_id }
    })

    // Registrar historial
    await tx.pedidos_historial_union.createMany({
      data: pedido_ids.map(pedido_id => ({
        importacion_id: importacion.importacion_id,
        pedido_id,
        accion: 'union',
        usuario_id,
        nota,
      }))
    })

    return importacion
  })

  return resultado
}

export const separarPedido = async (empresa_id, usuario_id, pedido_id, linea_ids, nota) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: true }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  // Verificar que las líneas pertenecen al pedido
  const lineasValidas = pedido.lineas.filter(l => linea_ids.includes(l.linea_id))
  if (lineasValidas.length !== linea_ids.length) {
    throw new AppError('Una o más líneas no pertenecen a este pedido', 400, 'LINEAS_INVALIDAS')
  }

  const subpedidos = await prisma.$transaction(async (tx) => {
    // Generar subíndice (A, B, C...)
    const existentes = await tx.pedido.count({
      where: { codigo_padre: pedido.codigo }
    })
    const subindice = String.fromCharCode(65 + existentes) // A, B, C...

    // Crear subpedido
    const subpedido = await tx.pedido.create({
      data: {
        empresa_id,
        creado_por: usuario_id,
        proveedor_id: pedido.proveedor_id,
        cliente_id: pedido.cliente_id,
        codigo: `${pedido.codigo}${subindice}`,
        codigo_padre: pedido.codigo,
        subindice,
        fecha_pedido: pedido.fecha_pedido,
        incoterm: pedido.incoterm,
        moneda: pedido.moneda,
        estado: pedido.estado,
        importacion_id: pedido.importacion_id,
      }
    })

    // Mover líneas al subpedido
    await tx.linea_pedido.updateMany({
      where: { linea_id: { in: linea_ids } },
      data: { pedido_id: subpedido.pedido_id }
    })

    // Registrar historial
    await tx.pedidos_historial_union.create({
      data: {
        pedido_id,
        accion: 'separacion',
        usuario_id,
        nota,
      }
    })

    return subpedido
  })

  return subpedidos
}

export const cancel = async (empresa_id, usuario_id, pedido_id, motivo) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  if (pedido.estado === 'cancelado') {
    throw new AppError('El pedido ya está cancelado', 400, 'PEDIDO_YA_CANCELADO')
  }

  await prisma.pedido.update({
    where: { pedido_id },
    data: {
      estado: 'cancelado',
    }
  })
}


// ============================================================
// 4. SCHEMA — pedidos.schema.js
// Validación de datos de entrada con Zod
// ============================================================
import { z } from 'zod'

export const createPedidoSchema = z.object({
  body: z.object({
    proveedor_id: z.number().int().positive(),
    cliente_id: z.number().int().positive().optional(),
    fecha_pedido: z.string().datetime(),
    incoterm: z.enum(['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']),
    moneda: z.string().length(3),
    lineas: z.array(z.object({
      producto_id: z.number().int().positive(),
      cantidad: z.number().positive(),
      precio_unit: z.number().positive(),
      nota: z.string().max(200).optional(),
    })).min(1, 'Debe tener al menos una línea'),
  })
})

export const updatePedidoSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/)
  }),
  body: z.object({
    incoterm: z.enum(['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']).optional(),
    moneda: z.string().length(3).optional(),
    cliente_id: z.number().int().positive().optional(),
  })
})
