import Redis from 'ioredis'
import { logger } from './logger.js'

let redis

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
  redis = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
      if (times > 5) {
        logger.error('Redis: No se pudo conectar después de 5 intentos')
        return null
      }
      return Math.min(times * 500, 3000)
    },
  })

  redis.on('connect', () => logger.info('✅ Redis conectado'))
  redis.on('error', (err) => logger.error('Redis error:', err))
} else {
  // Mock de Redis para entornos sin Redis (como producción sin Redis)
  logger.info('⚠️ Redis no configurado, usando mock (sin caché)')
  redis = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 1,
    quit: async () => {},
    on: () => {},
  }
}

export default redis
