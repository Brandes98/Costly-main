import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

// Log de queries solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} — ${e.duration}ms`)
  })
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e)
})

export default prisma
