import winston from 'winston'

const { combine, timestamp, printf, colorize, json } = winston.format

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
})

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp()),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp(), devFormat)
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json()),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    }),
  ],
})
