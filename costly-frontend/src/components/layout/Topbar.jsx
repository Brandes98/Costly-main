import { useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaPlus, FaTimes } from 'react-icons/fa';
import Button from '../ui/Button';

const TITLES = {
  '/dashboard': { title: 'Dashboard', bc: 'Inicio' },
  '/pedidos': { title: 'Pedidos', bc: 'Operaciones' },
  '/pedidos/nuevo': { title: 'Nuevo Pedido', bc: 'Pedidos' },
  '/importaciones': { title: 'Importaciones', bc: 'Operaciones' },
  '/costeos': { title: 'Costeo', bc: 'Operaciones' },
  '/seguimiento': { title: 'Seguimiento', bc: 'Operaciones' },
  '/aduana': { title: 'Tramite Aduana', bc: 'Operaciones' },
  '/pagos': { title: 'Pagos', bc: 'Operaciones' },
  '/proveedores': { title: 'Proveedores', bc: 'Catalogos' },
  '/productos': { title: 'Productos', bc: 'Catalogos' },
  '/clientes': { title: 'Clientes', bc: 'Catalogos' },
  '/reportes': { title: 'Reportes', bc: 'Analisis' },
  '/usuarios': { title: 'Usuarios', bc: 'Admin' },
  '/auditoria': { title: 'Auditoria', bc: 'Admin' },
  '/empresa': { title: 'Empresa', bc: 'Admin' },
};

export default function Topbar({ isMobile, isSidebarOpen, isSidebarCollapsed, onToggleSidebar }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const match = Object.keys(TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));

  const { title = 'Costly', bc = 'Inicio' } = TITLES[match] || {};

  return (
    <div className="bg-sur border-b border-border h-[52px] w-full min-w-0 flex items-center px-4 md:px-[22px] gap-3 flex-shrink-0 shadow-sh0">
      {isMobile && (
        <button
          className="w-9 h-9 rounded-lg bg-sur2 border border-border flex items-center justify-center cursor-pointer text-sm hover:border-tl hover:bg-tl-xl transition-all flex-shrink-0"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Cerrar menu' : 'Abrir menu'}
        >
          {isSidebarOpen ? <FaTimes /> : <FaBars />}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-serif text-base font-medium text-ink truncate">{title}</div>
        <div className="text-[11px] text-mist truncate">
          {bc} &rsaquo; <b className="text-tl">{title}</b>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg bg-sur2 border border-border flex items-center justify-center cursor-pointer text-sm relative hover:border-tl hover:bg-tl-xl transition-all">
          🔔
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rs rounded-full border-2 border-sur" />
        </button>
        <button
          className="btn btn-outline text-xs hidden sm:inline-flex"
          onClick={() => navigate('/pedidos')}
        >
          📋 Pedidos
        </button>
        <Button icon="create" onClick={() => navigate('/pedidos/nuevo')}>
          Nuevo pedido
        </Button>
      </div>
    </div>
  );
}
