export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body:   req.body,
      params: req.params,
      query:  req.query,
    })
    next()
  } catch (error) {
    console.log('ERROR NAME:', error.name)
    console.log('ERROR ERRORS:', error.errors)
    console.log('ERROR ISSUES:', error.issues)
    if (error.name !== 'ZodError') return next(error)

    const errores = error.issues.map(e => ({
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