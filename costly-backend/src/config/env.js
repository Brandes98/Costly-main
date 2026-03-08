import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV:          z.enum(['development', 'production', 'test']).default('development'),
  PORT:              z.string().default('3000'),
  DATABASE_URL:      z.string().min(1, 'DATABASE_URL es requerida'),
  JWT_SECRET:        z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN:    z.string().default('8h'),
  REDIS_URL:         z.string().default('redis://localhost:6379'),
  ALLOWED_ORIGINS:   z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
