// Parsear parámetros de paginación del query string
export const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1)
  const limit = Math.min(100, parseInt(query.limit) || 20)
  const skip  = (page - 1) * limit
  return { page, limit, skip }
}

// Construir meta de paginación para la respuesta
export const buildMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
})
