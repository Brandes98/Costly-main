import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: { code: 'NO_TOKEN', message: 'Token de acceso requerido' }
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que el usuario existe y está activo
    const usuario = await prisma.usuario.findUnique({
      where: { usuario_id: decoded.usuario_id },
      select: { usuario_id: true, empresa_id: true, rol: true, activo: true }
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        ok: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no autorizado' }
      })
    }

    req.user = usuario
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' }
      })
    }
    return res.status(401).json({
      ok: false,
      error: { code: 'INVALID_TOKEN', message: 'Token inválido' }
    })
  }
}
