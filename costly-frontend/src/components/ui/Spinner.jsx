import { createPortal } from 'react-dom';
import { FaArrowDown, FaArrowUp, FaTimes } from 'react-icons/fa';

// ── Spinner.jsx
export default function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return <div className={`${s} border-2 border-border border-t-tl rounded-full animate-spin`} />;
}

// ── EmptyState.jsx (named export para usar en barrel)
export function EmptyState({ icon = '📭', title = 'Sin resultados', description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-medium text-ink text-sm mb-1">{title}</div>
      {description && <div className="text-xs text-mist">{description}</div>}
    </div>
  );
}

export function Pill({ children, variant = 'gray' }) {
  const variants = {
    green: 'pill-green',
    yellow: 'pill-yellow',
    blue: 'pill-blue',
    gray: 'pill-gray',
    red: 'pill-red',
    violet: 'pill-violet',
  };
  return <span className={`pill ${variants[variant]}`}>{children}</span>;
}

// ── Semaforo.jsx
export function Semaforo({ color }) {
  const cls = { red: 's3r', yellow: 's3y', green: 's3g' }[color] || 's3g';
  return <span className={`s3 ${cls}`} />;
}

// ── KpiCard.jsx
export function KpiCard({ icon, value, label, delta, deltaUp, variant = 'tl' }) {
  const colors = {
    tl: { after: 'after:bg-tl', icon: 'bg-tl-l' },
    gd: { after: 'after:bg-gd', icon: 'bg-gd-l' },
    rs: { after: 'after:bg-rs', icon: 'bg-rs-l' },
    sg: { after: 'after:bg-sg', icon: 'bg-sg-l' },
  }[variant];

  return (
    <div
      className={`kpi relative after:content-[''] after:absolute after:top-0 after:right-0 after:w-12 after:h-12 after:rounded-bl-full after:opacity-[0.08] ${colors.after}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-2.5 ${colors.icon}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-ink leading-none">{value}</div>
      <div className="text-[11px] text-mist mt-0.5">{label}</div>
      {delta && (
        <div
          className={`text-[10.5px] font-medium mt-2 flex items-center gap-1 ${deltaUp ? 'text-sg' : 'text-rs'}`}
        >
          {deltaUp ? (
            <FaArrowUp className="text-[0.65rem]" />
          ) : (
            <FaArrowDown className="text-[0.65rem]" />
          )}
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

// ── Modal.jsx
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-sur rounded-card shadow-sh2 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-serif text-base font-medium text-ink">{title}</div>
          <button
            onClick={onClose}
            className="text-mist hover:text-ink text-base leading-none"
            title="Cerrar"
          >
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scroll">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ── Confirm.jsx
export function Confirm({ open, onClose, onConfirm, title, message, danger }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || '¿Estás seguro?'}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirmar
          </button>
        </>
      }
    >
      <p className="text-sm text-slate">{message}</p>
    </Modal>
  );
}
