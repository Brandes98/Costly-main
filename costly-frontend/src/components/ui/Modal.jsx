import { createPortal } from 'react-dom'

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-sur rounded-card shadow-sh2 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-serif text-base font-medium text-ink">{title}</div>
          <button onClick={onClose} className="text-mist hover:text-ink text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scroll">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({ open, onClose, onConfirm, title, message, danger }) {
  if (!open) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || '¿Estás seguro?'}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => { onConfirm(); onClose() }}
          >
            Confirmar
          </button>
        </>
      }
    >
      <p className="text-sm text-slate">{message}</p>
    </Modal>
  )
}

export default Modal
