// ============================================================
// src/modules/pedidos/pedidos.routes.js
// ============================================================
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/roles.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { auditLog } from '../../middlewares/audit.middleware.js'
import * as controller from './pedidos.controller.js'
import { createPedidoSchema, updatePedidoSchema, unirPedidosSchema, separarPedidoSchema } from './pedidos.schema.js'

const router = Router()
router.use(authenticate)

// ── CRUD base
router.get('/',      authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getAll)
router.get('/:id',   authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getById)
router.post('/',     authorize('operador', 'operador_sr', 'admin'), validate(createPedidoSchema), auditLog('pedido', 'INSERT'), controller.create)
router.patch('/:id', authorize('operador', 'operador_sr', 'admin'), validate(updatePedidoSchema), auditLog('pedido', 'UPDATE'), controller.update)
router.delete('/:id',authorize('admin'), auditLog('pedido', 'DELETE'), controller.cancel)

// ── Cambio de estado
router.patch('/:id/estado', authorize('operador', 'operador_sr', 'admin'), auditLog('pedido', 'UPDATE'), controller.updateEstado)

// ── Unión y separación
router.post('/unir',        authorize('operador_sr', 'admin'), validate(unirPedidosSchema),   auditLog('pedido', 'UPDATE'), controller.unirPedidos)
router.post('/:id/separar', authorize('operador_sr', 'admin'), validate(separarPedidoSchema), auditLog('pedido', 'UPDATE'), controller.separarPedido)

// ── Proyección de volumen (integrada en pedidos)
router.get('/:id/proyeccion',          authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.getProyeccion)
router.post('/:id/proyeccion/calcular',authorize('operador', 'operador_sr', 'admin'), controller.calcularProyeccion)
router.get('/:id/proyeccion/detalle',  authorize('consultas', 'operador', 'operador_sr', 'finanzas', 'admin'), controller.detalleProyeccion)

export default router


// ============================================================
// src/modules/pedidos/pedidos.controller.js
// ============================================================
import * as service from './pedidos.service.js'
import * as proyeccionService from './proyeccion.service.js'
import { successResponse, errorResponse } from '../../utils/response.utils.js'

export const getAll = async (req, res) => {
  try {
    return successResponse(res, await service.getAll(req.user.empresa_id, req.query))
  } catch (error) { return errorResponse(res, error) }
}

export const getById = async (req, res) => {
  try {
    return successResponse(res, await service.getById(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const create = async (req, res) => {
  try {
    return successResponse(res, await service.create(req.user.empresa_id, req.user.usuario_id, req.body), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const update = async (req, res) => {
  try {
    return successResponse(res, await service.update(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}

export const updateEstado = async (req, res) => {
  try {
    return successResponse(res, await service.updateEstado(req.user.empresa_id, parseInt(req.params.id), req.body.estado, req.user.usuario_id))
  } catch (error) { return errorResponse(res, error) }
}

export const unirPedidos = async (req, res) => {
  try {
    return successResponse(res, await service.unirPedidos(req.user.empresa_id, req.user.usuario_id, req.body.pedido_ids, req.body.nota), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const separarPedido = async (req, res) => {
  try {
    return successResponse(res, await service.separarPedido(req.user.empresa_id, req.user.usuario_id, parseInt(req.params.id), req.body.linea_ids, req.body.nota), 201)
  } catch (error) { return errorResponse(res, error) }
}

export const cancel = async (req, res) => {
  try {
    await service.cancel(req.user.empresa_id, req.user.usuario_id, parseInt(req.params.id), req.body.motivo)
    return successResponse(res, { message: 'Pedido cancelado correctamente' })
  } catch (error) { return errorResponse(res, error) }
}

// ── Proyección
export const getProyeccion = async (req, res) => {
  try {
    return successResponse(res, await proyeccionService.get(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}

export const calcularProyeccion = async (req, res) => {
  try {
    return successResponse(res, await proyeccionService.calcular(req.user.empresa_id, parseInt(req.params.id), req.body))
  } catch (error) { return errorResponse(res, error) }
}

export const detalleProyeccion = async (req, res) => {
  try {
    return successResponse(res, await proyeccionService.detalle(req.user.empresa_id, parseInt(req.params.id)))
  } catch (error) { return errorResponse(res, error) }
}


// ============================================================
// src/modules/pedidos/pedidos.service.js
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { generarCodigoPedido, generarCodigoImportacion } from '../../utils/codigo.utils.js'

const TRANSICIONES_VALIDAS = {
  borrador:      ['confirmado', 'cancelado'],
  confirmado:    ['en_produccion', 'cancelado'],
  en_produccion: ['listo_fabrica', 'cancelado'],
  listo_fabrica: ['embarcado'],
  embarcado:     ['en_transito'],
  en_transito:   ['en_puerto_cr'],
  en_puerto_cr:  ['en_aduana'],
  en_aduana:     ['en_bodega'],
  en_bodega:     ['entregado'],
  entregado:     ['cerrado'],
}

export const getAll = async (empresa_id, filters = {}) => {
  return await prisma.pedido.findMany({
    where: {
      empresa_id,
      ...(filters.estado       && { estado: filters.estado }),
      ...(filters.proveedor_id && { proveedor_id: parseInt(filters.proveedor_id) }),
      ...(filters.cliente_id   && { cliente_id: parseInt(filters.cliente_id) }),
    },
    include: {
      proveedor: { select: { nombre: true, pais: { select: { bandera: true, nombre: true } } } },
      cliente:   { select: { nombre: true } },
      hitos: {
        where: { estado: { in: ['pendiente', 'en_proceso'] } },
        orderBy: { fecha_plan: 'asc' },
        take: 1,
      },
      _count: { select: { lineas: true } },
    },
    orderBy: { creado_en: 'desc' },
  })
}

export const getById = async (empresa_id, pedido_id) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: {
      proveedor:  true,
      cliente:    true,
      lineas:     { include: { producto: true } },
      facturas:   true,
      hitos:      { orderBy: { fecha_plan: 'asc' } },
      pagos:      true,
      permisos:   true,
      proyeccion: { include: { detalle: true } },
    },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  return pedido
}

export const create = async (empresa_id, usuario_id, data) => {
  const codigo = await generarCodigoPedido(empresa_id)

  return await prisma.pedido.create({
    data: {
      empresa_id,
      creado_por:   usuario_id,
      codigo,
      proveedor_id: data.proveedor_id,
      cliente_id:   data.cliente_id,
      fecha_pedido: new Date(data.fecha_pedido),
      incoterm:     data.incoterm,
      moneda:       data.moneda,
      estado:       'borrador',
      lineas: {
        create: data.lineas.map((linea, index) => ({
          producto_id: linea.producto_id,
          numero:      index + 1,
          cantidad:    linea.cantidad,
          precio_unit: linea.precio_unit,
          total_linea: linea.cantidad * linea.precio_unit,
          nota:        linea.nota,
        })),
      },
    },
    include: { lineas: { include: { producto: true } } },
  })
}

export const update = async (empresa_id, pedido_id, data) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (['cancelado', 'cerrado'].includes(pedido.estado)) {
    throw new AppError('No se puede editar un pedido cancelado o cerrado', 400, 'PEDIDO_LOCKED')
  }
  return await prisma.pedido.update({ where: { pedido_id }, data })
}

export const updateEstado = async (empresa_id, pedido_id, nuevoEstado, usuario_id) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  const permitidos = TRANSICIONES_VALIDAS[pedido.estado] || []
  if (!permitidos.includes(nuevoEstado)) {
    throw new AppError(
      `No se puede cambiar de '${pedido.estado}' a '${nuevoEstado}'`,
      400, 'ESTADO_INVALIDO'
    )
  }
  return await prisma.pedido.update({ where: { pedido_id }, data: { estado: nuevoEstado } })
}

export const unirPedidos = async (empresa_id, usuario_id, pedido_ids, nota) => {
  const pedidos = await prisma.pedido.findMany({
    where: { pedido_id: { in: pedido_ids }, empresa_id }
  })
  if (pedidos.length !== pedido_ids.length) {
    throw new AppError('Uno o más pedidos no encontrados', 404, 'PEDIDOS_NOT_FOUND')
  }
  const yaConsolidados = pedidos.filter(p => p.importacion_id !== null)
  if (yaConsolidados.length > 0) {
    throw new AppError(
      `Los pedidos ${yaConsolidados.map(p => p.codigo).join(', ')} ya están consolidados`,
      400, 'PEDIDOS_YA_CONSOLIDADOS'
    )
  }

  return await prisma.$transaction(async (tx) => {
    const codigo = await generarCodigoImportacion(empresa_id)
    const importacion = await tx.importacion.create({
      data: {
        empresa_id,
        creado_por:   usuario_id,
        codigo,
        consolidado:  true,
        fecha_union:  new Date(),
        estado:       'en_proceso',
      }
    })
    await tx.pedido.updateMany({
      where: { pedido_id: { in: pedido_ids } },
      data:  { importacion_id: importacion.importacion_id }
    })
    await tx.pedidos_historial_union.createMany({
      data: pedido_ids.map(pedido_id => ({
        importacion_id: importacion.importacion_id,
        pedido_id,
        accion:     'union',
        usuario_id,
        nota,
      }))
    })
    return importacion
  })
}

export const separarPedido = async (empresa_id, usuario_id, pedido_id, linea_ids, nota) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: true }
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')

  const lineasValidas = pedido.lineas.filter(l => linea_ids.includes(l.linea_id))
  if (lineasValidas.length !== linea_ids.length) {
    throw new AppError('Una o más líneas no pertenecen a este pedido', 400, 'LINEAS_INVALIDAS')
  }

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.pedido.count({ where: { codigo_padre: pedido.codigo } })
    const subindice  = String.fromCharCode(65 + existentes) // A, B, C...

    const subpedido = await tx.pedido.create({
      data: {
        empresa_id,
        creado_por:    usuario_id,
        proveedor_id:  pedido.proveedor_id,
        cliente_id:    pedido.cliente_id,
        codigo:        `${pedido.codigo}${subindice}`,
        codigo_padre:  pedido.codigo,
        subindice,
        fecha_pedido:  pedido.fecha_pedido,
        incoterm:      pedido.incoterm,
        moneda:        pedido.moneda,
        estado:        pedido.estado,
        importacion_id:pedido.importacion_id,
      }
    })
    await tx.linea_pedido.updateMany({
      where: { linea_id: { in: linea_ids } },
      data:  { pedido_id: subpedido.pedido_id }
    })
    await tx.pedidos_historial_union.create({
      data: { pedido_id, accion: 'separacion', usuario_id, nota }
    })
    return subpedido
  })
}

export const cancel = async (empresa_id, usuario_id, pedido_id, motivo) => {
  const pedido = await prisma.pedido.findFirst({ where: { pedido_id, empresa_id } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (pedido.estado === 'cancelado') throw new AppError('El pedido ya está cancelado', 400, 'PEDIDO_YA_CANCELADO')
  await prisma.pedido.update({ where: { pedido_id }, data: { estado: 'cancelado' } })
}


// ============================================================
// src/modules/pedidos/proyeccion.service.js  ← archivo separado dentro de pedidos
// ============================================================
import prisma from '../../config/database.js'
import { AppError } from '../../utils/response.utils.js'
import { calcularProyeccion } from '../../utils/proyeccion.utils.js'

export const get = async (empresa_id, pedido_id) => {
  const proyeccion = await prisma.proyeccion_volumen.findFirst({
    where: { pedido: { pedido_id, empresa_id } },
    include: { detalle: true },
  })
  if (!proyeccion) throw new AppError('No hay proyección calculada para este pedido', 404, 'PROYECCION_NOT_FOUND')
  return proyeccion
}

export const calcular = async (empresa_id, pedido_id, opts = {}) => {
  const pedido = await prisma.pedido.findFirst({
    where: { pedido_id, empresa_id },
    include: { lineas: { include: { producto: true } } },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND')
  if (!pedido.lineas.length) throw new AppError('El pedido no tiene líneas', 400, 'SIN_LINEAS')

  const resultado = calcularProyeccion(pedido.lineas, opts.tipo_pallet_default)

  const proyeccion = await prisma.proyeccion_volumen.upsert({
    where:  { pedido_id },
    update: { ...resultado, calculado_en: new Date(), detalle: { deleteMany: {}, create: resultado.detalle } },
    create: { pedido_id, ...resultado, detalle: { create: resultado.detalle } },
    include: { detalle: true },
  })

  // Actualizar campos calculados en cada línea
  for (const det of resultado.detalle) {
    await prisma.linea_pedido.update({
      where: { linea_id: det.linea_id },
      data: {
        volumen_total_m3: det.volumen_m3,
        peso_total_kg:    det.peso_kg,
        cajas_estimadas:  det.cajas_estimadas,
      }
    })
  }

  return proyeccion
}

export const detalle = async (empresa_id, pedido_id) => {
  const proyeccion = await prisma.proyeccion_volumen.findFirst({
    where: { pedido: { pedido_id, empresa_id } },
    include: {
      detalle: {
        include: {
          linea_pedido: { include: { producto: { select: { nombre: true, sku: true } } } }
        }
      }
    },
  })
  if (!proyeccion) throw new AppError('No hay proyección calculada para este pedido', 404, 'PROYECCION_NOT_FOUND')
  return proyeccion
}


// ============================================================
// src/modules/pedidos/pedidos.schema.js
// ============================================================
import { z } from 'zod'

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DAP', 'DDP', 'CFR']
const ESTADOS   = ['borrador', 'confirmado', 'en_produccion', 'listo_fabrica', 'embarcado', 'en_transito', 'en_puerto_cr', 'en_aduana', 'en_bodega', 'entregado', 'cerrado', 'cancelado']

export const createPedidoSchema = z.object({
  body: z.object({
    proveedor_id:  z.number().int().positive(),
    cliente_id:    z.number().int().positive().optional(),
    fecha_pedido:  z.string().datetime(),
    incoterm:      z.enum(INCOTERMS),
    moneda:        z.string().length(3),
    lineas: z.array(z.object({
      producto_id: z.number().int().positive(),
      cantidad:    z.number().positive(),
      precio_unit: z.number().positive(),
      nota:        z.string().max(200).optional(),
    })).min(1, 'Debe tener al menos una línea'),
  })
})

export const updatePedidoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    incoterm:   z.enum(INCOTERMS).optional(),
    moneda:     z.string().length(3).optional(),
    cliente_id: z.number().int().positive().optional(),
  })
})

export const unirPedidosSchema = z.object({
  body: z.object({
    pedido_ids: z.array(z.number().int().positive()).min(2, 'Se necesitan al menos 2 pedidos para unir'),
    nota:       z.string().max(500).optional(),
  })
})

export const separarPedidoSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({
    linea_ids: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos una línea'),
    nota:      z.string().max(500).optional(),
  })
})
