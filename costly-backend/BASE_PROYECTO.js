// ============================================================
// server.js — Entry point
// ============================================================
import 'dotenv/config'
import app from './src/app.js'
import { logger } from './src/config/logger.js'

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  logger.info(`🚀 Costly API corriendo en puerto ${PORT}`)
  logger.info(`📦 Ambiente: ${process.env.NODE_ENV}`)
})

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err)
  server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})


// ============================================================
// src/app.js — Express app
// ============================================================
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import { errorHandler } from './middlewares/errorHandler.middleware.js'
import { globalRateLimit } from './middlewares/rateLimit.middleware.js'
import { sanitize } from './middlewares/sanitize.middleware.js'

// Rutas
import authRoutes from './modules/auth/auth.routes.js'
import usuariosRoutes from './modules/usuarios/usuarios.routes.js'
import proveedoresRoutes from './modules/proveedores/proveedores.routes.js'
import clientesRoutes from './modules/clientes/clientes.routes.js'
import productosRoutes from './modules/productos/productos.routes.js'
import pedidosRoutes from './modules/pedidos/pedidos.routes.js'
import importacionesRoutes from './modules/importaciones/importaciones.routes.js'
import costeosRoutes from './modules/costeos/costeos.routes.js'
import pagosRoutes from './modules/pagos/pagos.routes.js'
import hitosRoutes from './modules/hitos/hitos.routes.js'
import contenedoresRoutes from './modules/contenedores/contenedores.routes.js'
import tramiteRoutes from './modules/tramite-aduana/tramite.routes.js'
import tcRoutes from './modules/tc-historico/tc.routes.js'
import documentosRoutes from './modules/documentos/documentos.routes.js'
import permisosRoutes from './modules/permisos/permisos.routes.js'
import proyeccionRoutes from './modules/proyeccion/proyeccion.routes.js'
import reportesRoutes from './modules/reportes/reportes.routes.js'
import auditoriaRoutes from './modules/auditoria/auditoria.routes.js'

const app = express()

// ── Seguridad HTTP
app.use(helmet())
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}))

// ── CORS — solo orígenes permitidos
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}))

// ── Rate limiting global
app.use(globalRateLimit)

// ── Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Sanitización
app.use(sanitize)

// ── Compresión
app.use(compression())

// ── Logs HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
}

// ── Health check (sin auth)
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// ── Rutas API
const API = '/api/v1'
app.use(`${API}/auth`,          authRoutes)
app.use(`${API}/usuarios`,      usuariosRoutes)
app.use(`${API}/proveedores`,   proveedoresRoutes)
app.use(`${API}/clientes`,      clientesRoutes)
app.use(`${API}/productos`,     productosRoutes)
app.use(`${API}/pedidos`,       pedidosRoutes)
app.use(`${API}/importaciones`, importacionesRoutes)
app.use(`${API}/costeos`,       costeosRoutes)
app.use(`${API}/pagos`,         pagosRoutes)
app.use(`${API}/hitos`,         hitosRoutes)
app.use(`${API}/contenedores`,  contenedoresRoutes)
app.use(`${API}/tramite-aduana`,tramiteRoutes)
app.use(`${API}/tc`,            tcRoutes)
app.use(`${API}/documentos`,    documentosRoutes)
app.use(`${API}/permisos`,      permisosRoutes)
app.use(`${API}/proyeccion`,    proyeccionRoutes)
app.use(`${API}/reportes`,      reportesRoutes)
app.use(`${API}/auditoria`,     auditoriaRoutes)

// ── 404
app.use((req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } })
})

// ── Error handler global
app.use(errorHandler)

export default app


// ============================================================
// src/config/database.js — Prisma singleton
// ============================================================
import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

// Log de queries en desarrollo
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} — ${e.duration}ms`)
  })
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e)
})

export default prisma


// ============================================================
// src/config/logger.js — Winston logger
// ============================================================
import winston from 'winston'

const { combine, timestamp, printf, colorize, json } = winston.format

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
})

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp()),
  transports: [
    // Consola
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp(), devFormat)
    }),
    // Archivo de errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json()),
    }),
    // Archivo general
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    }),
  ],
})


// ============================================================
// src/middlewares/auth.middleware.js — Verificación JWT
// ============================================================
import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: { code: 'NO_TOKEN', message: 'Token de acceso requerido' }
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que el usuario aún existe y está activo
    const usuario = await prisma.usuario.findUnique({
      where: { usuario_id: decoded.usuario_id },
      select: { usuario_id: true, empresa_id: true, rol: true, activo: true }
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autorizado' }
      })
    }

    req.user = usuario
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' }
      })
    }
    return res.status(401).json({
      ok: false,
      error: { code: 'INVALID_TOKEN', message: 'Token inválido' }
    })
  }
}


// ============================================================
// src/middlewares/roles.middleware.js — Control por rol
// ============================================================
const JERARQUIA = {
  consultas:   1,
  operador:    2,
  finanzas:    2,
  operador_sr: 3,
  admin:       4,
}

export const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = req.user?.rol

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No tenés permisos para realizar esta acción'
        }
      })
    }
    next()
  }
}

// Para verificar nivel mínimo
export const authorizeLevel = (nivelMinimo) => {
  return (req, res, next) => {
    const nivel = JERARQUIA[req.user?.rol] || 0
    if (nivel < nivelMinimo) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Nivel de acceso insuficiente' }
      })
    }
    next()
  }
}


// ============================================================
// src/middlewares/validate.middleware.js — Validación Zod
// ============================================================
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    })
    next()
  } catch (error) {
    const errores = error.errors.map(e => ({
      campo: e.path.join('.'),
      mensaje: e.message,
    }))
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        detalles: errores,
      }
    })
  }
}


// ============================================================
// src/middlewares/rateLimit.middleware.js — Rate limiting
// ============================================================
import rateLimit from 'express-rate-limit'

// Límite global — 100 requests por minuto
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes, intentá en un minuto' }
  }
})

// Límite estricto para auth — 10 intentos por 15 minutos
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    ok: false,
    error: { code: 'RATE_LIMIT_AUTH', message: 'Demasiados intentos de login, intentá en 15 minutos' }
  }
})


// ============================================================
// src/middlewares/sanitize.middleware.js — Sanitización XSS
// ============================================================
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value)
  }
  return value
}

const sanitizeObject = (obj) => {
  const sanitized = {}
  for (const key in obj) {
    sanitized[key] = sanitizeValue(obj[key])
  }
  return sanitized
}

export const sanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body)
  if (req.query) req.query = sanitizeObject(req.query)
  if (req.params) req.params = sanitizeObject(req.params)
  next()
}


// ============================================================
// src/middlewares/audit.middleware.js — Auditoría automática
// ============================================================
import prisma from '../config/database.js'

export const auditLog = (entidad_tipo, accion) => {
  return async (req, res, next) => {
    // Guardar el json original del body para comparar después
    req.auditData = {
      entidad_tipo,
      accion,
      entidad_id: req.params?.id ? parseInt(req.params.id) : null,
      valor_antes: null,
    }
    next()
  }
}

// Llamar este helper desde el service cuando se confirma el cambio
export const registrarAuditoria = async ({ empresa_id, usuario_id, accion, entidad_tipo, entidad_id, campo, valor_antes, valor_despues, ip }) => {
  try {
    await prisma.auditoria.create({
      data: {
        empresa_id,
        usuario_id,
        accion,
        entidad_tipo,
        entidad_id,
        campo,
        valor_antes,
        valor_despues,
        ip,
        creado_en: new Date(),
      }
    })
  } catch (error) {
    // El error de auditoría no debe romper la operación principal
    console.error('Error registrando auditoría:', error)
  }
}


// ============================================================
// src/middlewares/errorHandler.middleware.js
// ============================================================
import { logger } from '../config/logger.js'

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  // Error de nuestra app
  if (err.isAppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message }
    })
  }

  // Error de Prisma — registro no encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Registro no encontrado' }
    })
  }

  // Error de Prisma — duplicado
  if (err.code === 'P2002') {
    return res.status(409).json({
      ok: false,
      error: { code: 'DUPLICATE', message: 'Ya existe un registro con ese valor' }
    })
  }

  // Error genérico — nunca exponer detalles internos en producción
  return res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message
    }
  })
}


// ============================================================
// src/utils/response.utils.js — Respuestas estándar
// ============================================================
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isAppError = true
  }
}

export const successResponse = (res, data, statusCode = 200, meta = null) => {
  const response = { ok: true, data }
  if (meta) response.meta = meta
  return res.status(statusCode).json(response)
}

export const errorResponse = (res, error) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({
      ok: false,
      error: { code: error.code, message: error.message }
    })
  }
  // Error inesperado — dejar que lo maneje el errorHandler global
  throw error
}


// ============================================================
// src/utils/codigo.utils.js — Generación de códigos
// ============================================================
import prisma from '../config/database.js'

export const generarCodigoPedido = async (empresa_id) => {
  const año = new Date().getFullYear()
  const count = await prisma.pedido.count({
    where: { empresa_id, codigo: { startsWith: `PED-${año}` } }
  })
  return `PED-${año}-${String(count + 1).padStart(3, '0')}`
}

export const generarCodigoImportacion = async (empresa_id) => {
  const año = new Date().getFullYear()
  const count = await prisma.importacion.count({
    where: { empresa_id, codigo: { startsWith: `IMP-${año}` } }
  })
  return `IMP-${año}-${String(count + 1).padStart(3, '0')}`
}
