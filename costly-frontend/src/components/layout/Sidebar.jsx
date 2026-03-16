import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { cn } from '../../lib/utils'

const NAV = [
  { label: 'Principal' },
  { to: '/dashboard',    icon: '⬡', label: 'Dashboard' },
  { label: 'Operaciones' },
  { to: '/pedidos',      icon: '◈', label: 'Pedidos' },
  { to: '/importaciones',icon: '🚢', label: 'Importaciones' },
  { to: '/costeos',      icon: '💰', label: 'Costeo' },
  { to: '/seguimiento',  icon: '◷', label: 'Seguimiento' },
  { to: '/aduana',       icon: '🏛', label: 'Aduana' },
  { to: '/pagos',        icon: '💳', label: 'Pagos' },
  { label: 'Catálogos' },
  { to: '/proveedores',  icon: '◻', label: 'Proveedores' },
  { to: '/productos',    icon: '◻', label: 'Productos' },
  { to: '/clientes',     icon: '◻', label: 'Clientes' },
  { label: 'Análisis' },
  { to: '/reportes',     icon: '▦', label: 'Reportes' },
  { label: 'Admin' },
  { to: '/usuarios',     icon: '◎', label: 'Usuarios' },
  { to: '/auditoria',    icon: '◎', label: 'Auditoría' },
  { to: '/empresa',      icon: '🏢', label: 'Empresa' },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const { usuario, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = usuario?.nombre
    ?.split(' ').slice(0, 2).map(w => w[0]).join('') || 'U'

  return (
    <aside className="w-[210px] flex-shrink-0 bg-ink flex flex-col relative overflow-hidden">
      {/* Decoración */}
      <div className="absolute -top-15 -right-15 w-40 h-40 rounded-full bg-tl-m opacity-[0.08] pointer-events-none" />
      <div className="absolute bottom-20 -left-10 w-28 h-28 rounded-full bg-gd opacity-[0.07] pointer-events-none" />

      {/* Logo */}
      <div className="px-[18px] py-5 border-b border-white/[0.07] relative z-10">
        <div className="font-serif text-xl font-medium text-white">
          Cost<span className="text-tl-m">ly</span>
        </div>
        <div className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5">
          Vadibarot Ltda.
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 overflow-y-auto relative z-10 custom-scroll">
        {NAV.map((item, i) => {
          if (!item.to) {
            return (
              <div key={i} className="text-[9px] tracking-[0.14em] uppercase text-white/20 px-[18px] py-2.5 font-medium">
                {item.label}
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-[18px] py-2 text-[12.5px] transition-all duration-150 relative',
                isActive
                  ? 'text-white bg-tl/[0.22] font-medium before:content-[""] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-tl-m before:rounded-r'
                  : 'text-white/45 hover:text-white/85 hover:bg-white/[0.05]'
              )}
            >
              <span className="text-[13px] w-4 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="px-[18px] py-3 border-t border-white/[0.07] flex items-center gap-2 relative z-10">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tl to-[#0D4A4A] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white/80 font-medium truncate">{usuario?.nombre}</div>
          <div className="text-[10px] text-white/30 capitalize">{usuario?.rol?.replace('_', ' ')}</div>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/20 hover:text-white/60 text-xs transition-colors"
          title="Cerrar sesión"
        >
          ⏻
        </button>
      </div>
    </aside>
  )
}
