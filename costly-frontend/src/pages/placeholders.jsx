function ComingSoon({ title, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-serif text-xl font-medium text-ink mb-2">{title}</div>
      <div className="text-xs text-mist">Esta pantalla está en desarrollo</div>
    </div>
  );
}

export function ImportacionesPage() {
  return <ComingSoon title="Importaciones" icon="🚢" />;
}
export function CosteosPage() {
  return <ComingSoon title="Costeo" icon="💰" />;
}
export function SeguimientoPage() {
  return <ComingSoon title="Seguimiento" icon="◷" />;
}
export function AduanaPage() {
  return <ComingSoon title="Trámite Aduana" icon="🏛" />;
}
export function ProductosPage() {
  return <ComingSoon title="Productos" icon="📦" />;
}
export function ClientesPage() {
  return <ComingSoon title="Clientes" icon="🧑‍💼" />;
}
export function ReportesPage() {
  return <ComingSoon title="Reportes" icon="▦" />;
}
export function UsuariosPage() {
  return <ComingSoon title="Usuarios" icon="◎" />;
}
export function AuditoriaPage() {
  return <ComingSoon title="Auditoría" icon="🔍" />;
}
export function EmpresaPage() {
  return <ComingSoon title="Empresa" icon="🏢" />;
}
