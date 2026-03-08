const JERARQUIA = {
  consultas:   1,
  operador:    2,
  finanzas:    2,
  operador_sr: 3,
  admin:       4,
}

// Verificar que el usuario tiene alguno de los roles permitidos
export const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = req.user?.rol

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No tenés permisos para realizar esta acción'
        }
      })
    }
    next()
  }
}

// Verificar que el usuario tiene al menos un nivel jerárquico
export const authorizeLevel = (nivelMinimo) => {
  return (req, res, next) => {
    const nivel = JERARQUIA[req.user?.rol] || 0
    if (nivel < nivelMinimo) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Nivel de acceso insuficiente' }
      })
    }
    next()
  }
}
