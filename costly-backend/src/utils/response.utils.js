// Error controlado de la aplicación
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isAppError = true
  }
}

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]'

// JSON.stringify no soporta BigInt: lo convertimos a string de forma segura.
const sanitizeBigInt = (value) => {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(sanitizeBigInt)
  if (isPlainObject(value)) {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = sanitizeBigInt(val)
    }
    return out
  }
  return value
}

// Respuesta exitosa estándar
export const successResponse = (res, data, statusCode = 200, meta = null) => {
  const response = { ok: true, data: sanitizeBigInt(data) }
  if (meta) response.meta = sanitizeBigInt(meta)
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
