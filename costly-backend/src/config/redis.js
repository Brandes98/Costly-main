import Redis from 'ioredis'
import { logger } from './logger.js'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
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

export default redis
