// ============================================================
// src/modules/auth/auth.routes.js
// ============================================================
import { Router } from 'express'
import { validate } from '../../middlewares/validate.middleware.js'
import { authRateLimit } from '../../middlewares/rateLimit.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as controller from './auth.controller.js'
import { loginSchema, changePasswordSchema } from './auth.schema.js'

const router = Router()

// POST /api/v1/auth/login
router.post('/login',
  authRateLimit,
  validate(loginSchema),
  controller.login
)

// POST /api/v1/auth/logout
router.post('/logout',
  authenticate,
  controller.logout
)

// GET /api/v1/auth/me
router.get('/me',
  authenticate,
  controller.me
)

// PATCH /api/v1/auth/change-password
router.patch('/change-password',
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword
)

export default router