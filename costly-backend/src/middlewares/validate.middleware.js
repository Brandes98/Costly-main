export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body:   req.body,
      params: req.params,
      query:  req.query,
    })
    next()
  } catch (error) {
    const errores = error.errors.map(e => ({
      campo:   e.path.join('.'),
      mensaje: e.message,
    }))
    return res.status(400).json({
      ok: false,
      error: {
        code:     'VALIDATION_ERROR',
        message:  'Datos inválidos',
        detalles: errores,
      }
    })
  }
}
