import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FaPowerOff, FaTimes } from 'react-icons/fa';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../lib/utils';

const NAV = [
  { label: 'Principal' },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { label: 'Operaciones' },
  { to: '/pedidos', icon: '📋', label: 'Pedidos' },
  { to: '/importaciones', icon: '🚢', label: 'Importaciones' },
  { to: '/costeos', icon: '💰', label: 'Costeo' },
  { to: '/seguimiento', icon: '⏱️', label: 'Seguimiento' },
  { to: '/aduana', icon: '🏛️', label: 'Aduana' },
  { to: '/pagos', icon: '💳', label: 'Pagos' },
  { label: 'Catálogos' },
  { to: '/proveedores', icon: '🏭', label: 'Proveedores' },
  { to: '/productos', icon: '📦', label: 'Productos' },
  { to: '/clientes', icon: '👥', label: 'Clientes' },
  { label: 'Análisis' },
  { to: '/reportes', icon: '📈', label: 'Reportes' },
  { label: 'Admin' },
  { to: '/usuarios', icon: '👤', label: 'Usuarios' },
  { to: '/auditoria', icon: '🔎', label: 'Auditoría' },
  { to: '/empresa', icon: '🏢', label: 'Empresa' },
];

export default function Sidebar({ isMobile, isOpen, isCollapsed, onClose }) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    usuario?.nombre
      ?.split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('') || 'U';

  const desktopClasses = isCollapsed
    ? 'w-[74px] h-screen flex-shrink-0'
    : 'w-[210px] h-screen flex-shrink-0';

  const sidebarNode = (
    <>
      {isMobile ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menu"
          aria-hidden={!isOpen}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(26, 36, 51, 0.35)',
            backdropFilter: 'blur(2px)',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: 'opacity 220ms ease',
          }}
        />
      ) : null}

      <aside
        style={
          isMobile
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '230px',
                zIndex: 9999,
                transform: isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
                opacity: isOpen ? 1 : 0,
                visibility: isOpen ? 'visible' : 'hidden',
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: isOpen
                  ? 'transform 220ms ease-out, opacity 180ms ease-out'
                  : 'transform 220ms ease-in, opacity 140ms ease-in, visibility 0ms linear 220ms',
                background: '#1A2433',
                boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                willChange: 'transform',
                contain: 'paint',
                backfaceVisibility: 'hidden',
              }
            : {
                background: '#1A2433',
              }
        }
        className={cn('flex flex-col relative overflow-hidden', isMobile ? '' : desktopClasses)}
      >
        <div className="flex flex-1 flex-col min-h-0">
          <div className="absolute -top-11 -right-12 w-40 h-40 rounded-full bg-tl-m opacity-[0.08] pointer-events-none" />
          <div className="absolute bottom-20 -left-10 w-28 h-28 rounded-full bg-gd opacity-[0.07] pointer-events-none" />

          <div
            className={cn(
              'border-b border-white/[0.07] relative z-10',
              isCollapsed && !isMobile ? 'px-4 py-5' : 'px-[18px] py-5',
            )}
          >
            <div
              className={cn(
                'font-serif font-medium text-white',
                isCollapsed && !isMobile ? 'text-center text-2xl' : 'text-xl',
              )}
            >
              Cost<span className="text-tl-m">ly</span>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5">
                Vadibarot Ltda.
              </div>
            )}
            {isMobile ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 text-white/60 hover:text-white text-base"
                title="Cerrar menu"
              >
                <FaTimes />
              </button>
            ) : null}
          </div>

          <nav className="flex-1 py-2.5 overflow-y-auto relative z-10 custom-scroll">
            {NAV.map((item, index) => {
              if (!item.to) {
                if (isCollapsed && !isMobile) {
                  return <div key={index} className="h-4" />;
                }

                return (
                  <div
                    key={index}
                    className="text-[9px] tracking-[0.14em] uppercase text-white/20 px-[18px] py-2.5 font-medium"
                  >
                    {item.label}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => isMobile && onClose()}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center text-[12.5px] transition-all duration-150 relative',
                      isCollapsed && !isMobile
                        ? 'justify-center px-3 py-2.5 mx-2 rounded-lg'
                        : 'gap-2 px-[18px] py-2',
                      isActive
                        ? 'text-white bg-tl/[0.22] font-medium before:content-[""] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-tl-m before:rounded-r'
                        : 'text-white/45 hover:text-white/85 hover:bg-white/[0.05]',
                    )
                  }
                >
                  <span className="text-[13px] w-4 text-center">{item.icon}</span>
                  {(!isCollapsed || isMobile) && item.label}
                </NavLink>
              );
            })}
          </nav>

          <div
            className={cn(
              'border-t border-white/[0.07] relative z-10',
              isCollapsed && !isMobile ? 'px-2 py-3' : 'px-[18px] py-3',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2',
                isCollapsed && !isMobile && 'justify-center',
              )}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tl to-[#0D4A4A] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                {initials}
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white/80 font-medium truncate">
                    {usuario?.nombre}
                  </div>
                  <div className="text-[10px] text-white/30 capitalize">
                    {usuario?.rol?.replace('_', ' ')}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="text-white/20 hover:text-white/60 text-xs transition-colors"
                title="Cerrar sesion"
              >
                <FaPowerOff />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  return isMobile ? createPortal(sidebarNode, document.body) : sidebarNode;
}
