import prisma from '../config/database.js'

// Middleware para marcar la request con datos de auditoría
export const auditLog = (entidad_tipo, accion) => {
  return async (req, res, next) => {
    req.auditData = {
      entidad_tipo,
      accion,
      entidad_id: req.params?.id ? parseInt(req.params.id) : null,
    }
    next()
  }
}

// Helper para registrar auditoría desde cualquier service
export const registrarAuditoria = async ({
  empresa_id,
  usuario_id,
  accion,
  entidad_tipo,
  entidad_id,
  campo,
  valor_antes,
  valor_despues,
  ip,
}) => {
  try {
    await prisma.auditoria.create({
      data: {
        empresa_id,
        usuario_id,
        accion,
        entidad_tipo,
        entidad_id,
        campo,
        valor_antes,
        valor_despues,
        ip,
        creado_en: new Date(),
      }
    })
  } catch (error) {
    // El error de auditoría NO debe romper la operación principal
    console.error('Error registrando auditoría:', error)
  }
}
