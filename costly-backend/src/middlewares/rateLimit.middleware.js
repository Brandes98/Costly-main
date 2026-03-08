import rateLimit from 'express-rate-limit'

// Límite global — 100 requests por minuto por IP
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

// Límite estricto para auth — 10 intentos por 15 minutos (anti brute force)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    ok: false,
    error: { code: 'RATE_LIMIT_AUTH', message: 'Demasiados intentos de login, intentá en 15 minutos' }
  }
})
