const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      //.replace(/\//g, '&#x2F;')
      .trim()
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value)
  }
  return value
}

const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeValue)
  }
  const sanitized = {}
  for (const key in obj) {
    sanitized[key] = sanitizeValue(obj[key])
  }
  return sanitized
}

export const sanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body)

  // req.query es readonly en Express 4 — sanitizar los valores sin reasignar
  if (req.query) {
    const sanitizedQuery = sanitizeObject(req.query)
    for (const key in sanitizedQuery) {
      req.query[key] = sanitizedQuery[key]
    }
  }

  // req.params también puede ser readonly
  if (req.params) {
    const sanitizedParams = sanitizeObject(req.params)
    for (const key in sanitizedParams) {
      req.params[key] = sanitizedParams[key]
    }
  }

  next()
}