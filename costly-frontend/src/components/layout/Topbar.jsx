import { useLocation, useNavigate } from 'react-router-dom'

const TITLES = {
  '/dashboard':    { title: 'Dashboard',       bc: 'Inicio' },
  '/pedidos':      { title: 'Pedidos',          bc: 'Operaciones' },
  '/pedidos/nuevo':{ title: 'Nuevo Pedido',     bc: 'Pedidos' },
  '/importaciones':{ title: 'Importaciones',    bc: 'Operaciones' },
  '/costeos':      { title: 'Costeo',           bc: 'Operaciones' },
  '/seguimiento':  { title: 'Seguimiento',      bc: 'Operaciones' },
  '/aduana':       { title: 'Trámite Aduana',   bc: 'Operaciones' },
  '/pagos':        { title: 'Pagos',            bc: 'Operaciones' },
  '/proveedores':  { title: 'Proveedores',      bc: 'Catálogos' },
  '/productos':    { title: 'Productos',        bc: 'Catálogos' },
  '/clientes':     { title: 'Clientes',         bc: 'Catálogos' },
  '/reportes':     { title: 'Reportes',         bc: 'Análisis' },
  '/usuarios':     { title: 'Usuarios',         bc: 'Admin' },
  '/auditoria':    { title: 'Auditoría',        bc: 'Admin' },
  '/empresa':      { title: 'Empresa',          bc: 'Admin' },
}

export default function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Buscar el título más específico
  const match = Object.keys(TITLES)
    .sort((a, b) => b.length - a.length)
    .find(k => pathname.startsWith(k))

  const { title = 'Costly', bc = 'Inicio' } = TITLES[match] || {}

  return (
    <div className="bg-sur border-b border-border h-[52px] flex items-center px-[22px] gap-3 flex-shrink-0 shadow-sh0">
      <div className="flex-1">
        <div className="font-serif text-base font-medium text-ink">{title}</div>
        <div className="text-[11px] text-mist">
          {bc} &rsaquo; <b className="text-tl">{title}</b>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg bg-sur2 border border-border flex items-center justify-center cursor-pointer text-sm relative hover:border-tl hover:bg-tl-xl transition-all">
          🔔
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rs rounded-full border-2 border-sur" />
        </button>
        <button
          className="btn btn-outline text-xs"
          onClick={() => navigate('/pedidos')}
        >
          📋 Pedidos
        </button>
        <button
          className="btn btn-primary text-xs"
          onClick={() => navigate('/pedidos/nuevo')}
        >
          ＋ Nuevo pedido
        </button>
      </div>
    </div>
  )
}
