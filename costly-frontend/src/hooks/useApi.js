import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api.get('/auth/me') })

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════
export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [pedidos, alertas] = await Promise.all([
        api.get('/pedidos?limit=10'),
        api.post('/reportes/generar', { tipo: 'r05', config: { dias_alerta: 7 } }),
      ])
      return { pedidos: pedidos.data, alertas: alertas.data?.data || [] }
    },
    refetchInterval: 1000 * 60 * 2, // refetch cada 2 min
  })

export const useReporteR01 = () =>
  useQuery({
    queryKey: ['r01'],
    queryFn: () => api.post('/reportes/generar', { tipo: 'r01' }).then(r => r.data?.data || []),
  })

// ══════════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════════
export const usePedidos = (filters = {}) =>
  useQuery({
    queryKey: ['pedidos', filters],
    queryFn: () => api.get('/pedidos', { params: filters }).then(r => r.data),
  })

export const usePedido = (id) =>
  useQuery({
    queryKey: ['pedido', id],
    queryFn: () => api.get(`/pedidos/${id}`).then(r => r.data),
    enabled: !!id,
  })

export const useCreatePedido = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/pedidos', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}

export const useUpdateEstadoPedido = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }) => api.patch(`/pedidos/${id}/estado`, { estado }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.invalidateQueries({ queryKey: ['pedido', id] })
    },
  })
}

// ══════════════════════════════════════════════
// IMPORTACIONES
// ══════════════════════════════════════════════
export const useImportaciones = (filters = {}) =>
  useQuery({
    queryKey: ['importaciones', filters],
    queryFn: () => api.get('/importaciones', { params: filters }).then(r => r.data),
  })

export const useImportacion = (id) =>
  useQuery({
    queryKey: ['importacion', id],
    queryFn: () => api.get(`/importaciones/${id}`).then(r => r.data),
    enabled: !!id,
  })

// ══════════════════════════════════════════════
// PROVEEDORES
// ══════════════════════════════════════════════
export const useProveedores = (filters = {}) =>
  useQuery({
    queryKey: ['proveedores', filters],
    queryFn: () => api.get('/proveedores', { params: filters }).then(r => r.data),
  })

export const useCreateProveedor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/proveedores', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

export const useUpdateProveedor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/proveedores/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

export const useDeleteProveedor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/proveedores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

// ══════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════
export const useClientes = (filters = {}) =>
  useQuery({
    queryKey: ['clientes', filters],
    queryFn: () => api.get('/clientes', { params: filters }).then(r => r.data),
  })

export const useCreateCliente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/clientes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export const useUpdateCliente = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/clientes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

// ══════════════════════════════════════════════
// PRODUCTOS
// ══════════════════════════════════════════════
export const useProductos = (filters = {}) =>
  useQuery({
    queryKey: ['productos', filters],
    queryFn: () => api.get('/productos', { params: filters }).then(r => r.data),
  })

export const useCreateProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/productos', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export const useUpdateProducto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/productos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

// ══════════════════════════════════════════════
// PAGOS
// ══════════════════════════════════════════════
export const usePagos = (filters = {}) =>
  useQuery({
    queryKey: ['pagos', filters],
    queryFn: () => api.get('/pagos', { params: filters }).then(r => r.data),
  })

export const useCreatePago = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/pagos', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pagos'] }),
  })
}

export const useConfirmPago = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/pagos/${id}/confirmar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pagos'] }),
  })
}

// ══════════════════════════════════════════════
// HITOS
// ══════════════════════════════════════════════
export const useHitos = (filters = {}) =>
  useQuery({
    queryKey: ['hitos', filters],
    queryFn: () => api.get('/hitos', { params: filters }).then(r => r.data),
  })

export const useUpdateHito = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/hitos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hitos'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

// ══════════════════════════════════════════════
// TC HISTORICO
// ══════════════════════════════════════════════
export const useTCHoy = () =>
  useQuery({
    queryKey: ['tc', 'hoy'],
    queryFn: () => api.get('/tc/hoy').then(r => r.data),
    staleTime: 1000 * 60 * 60 * 4, // 4 horas
  })

// ══════════════════════════════════════════════
// REPORTES
// ══════════════════════════════════════════════
export const useGenerar = () =>
  useMutation({
    mutationFn: ({ tipo, config }) => api.post('/reportes/generar', { tipo, config }),
  })

export const useReportes = () =>
  useQuery({
    queryKey: ['reportes'],
    queryFn: () => api.get('/reportes').then(r => r.data?.reportes || []),
  })

// ══════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════
export const useUsuarios = () =>
  useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
  })

export const useCreateUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/usuarios', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

// ══════════════════════════════════════════════
// AUDITORIA
// ══════════════════════════════════════════════
export const useAuditoria = (filters = {}) =>
  useQuery({
    queryKey: ['auditoria', filters],
    queryFn: () => api.get('/auditoria', { params: filters }).then(r => r.data),
  })

// ══════════════════════════════════════════════
// EMPRESA
// ══════════════════════════════════════════════
export const useEmpresa = () =>
  useQuery({
    queryKey: ['empresa'],
    queryFn: () => api.get('/empresa').then(r => r.data),
  })

// ══════════════════════════════════════════════
// CONTENEDORES
// ══════════════════════════════════════════════
export const useContenedores = (filters = {}) =>
  useQuery({
    queryKey: ['contenedores', filters],
    queryFn: () => api.get('/contenedores', { params: filters }).then(r => r.data),
  })

// ══════════════════════════════════════════════
// PERMISOS
// ══════════════════════════════════════════════
export const usePermisos = (filters = {}) =>
  useQuery({
    queryKey: ['permisos', filters],
    queryFn: () => api.get('/permisos', { params: filters }).then(r => r.data),
  })
