// Error controlado de la aplicación
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isAppError = true
  }
}

// Respuesta exitosa estándar
export const successResponse = (res, data, statusCode = 200, meta = null) => {
  const response = { ok: true, data }
  if (meta) response.meta = meta
  return res.status(statusCode).json(response)
}

// Respuesta de error desde controller
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
