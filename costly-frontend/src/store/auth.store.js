import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:   null,
      usuario: null,

      setAuth: (token, usuario) => set({ token, usuario }),
      logout:  () => set({ token: null, usuario: null }),

      isAuthenticated: () => !!get().token,
      isAdmin:         () => get().usuario?.rol === 'admin',
      isOperador:      () => ['operador', 'operador_sr', 'admin'].includes(get().usuario?.rol),
      isFinanzas:      () => ['finanzas', 'operador_sr', 'admin'].includes(get().usuario?.rol),
    }),
    { name: 'costly-auth' }
  )
)
