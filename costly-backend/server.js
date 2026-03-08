import 'dotenv/config'
import app from './src/app.js'
import { logger } from './src/config/logger.js'

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  logger.info(`🚀 Costly API corriendo en puerto ${PORT}`)
  logger.info(`📦 Ambiente: ${process.env.NODE_ENV}`)
})

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err)
  server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})
