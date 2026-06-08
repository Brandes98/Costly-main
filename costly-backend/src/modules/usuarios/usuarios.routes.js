// ============================================================
// src/modules/usuarios/usuarios.routes.js
// ============================================================
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/roles.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { auditLog } from '../../middlewares/audit.middleware.js';
import * as controller from './usuarios.controller.js';
import { createUsuarioSchema, updateUsuarioSchema } from './usuarios.schema.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/usuarios/
router.get('/', authorize('admin'), controller.getAll);

// GET /api/v1/usuarios/:id
router.get('/:id', authorize('admin'), controller.getById);

// POST /api/v1/usuarios/
router.post(
  '/',
  authorize('admin'),
  validate(createUsuarioSchema),
  auditLog('usuario', 'INSERT'),
  controller.create,
);

// PATCH /api/v1/usuarios/:id
router.patch(
  '/:id',
  authorize('admin'),
  validate(updateUsuarioSchema),
  auditLog('usuario', 'UPDATE'),
  controller.update,
);

// DELETE /api/v1/usuarios/:id
router.delete('/:id', authorize('admin'), auditLog('usuario', 'DELETE'), controller.deactivate);

router.patch('/:id/password', authorize('admin'), controller.cambiarPassword)

export default router;
