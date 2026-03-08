import { logger } from '../config/logger.js'

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    path:  req.path,
    method: req.method,
  })

  // Error controlado de la app
  if (err.isAppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message }
    })
  }

  // Prisma — registro no encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Registro no encontrado' }
    })
  }

  // Prisma — valor duplicado (unique constraint)
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
