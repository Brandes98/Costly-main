import { FaPlus, FaPen, FaTrash } from 'react-icons/fa';

export function IconButton({ variant = 'edit', onClick, disabled, title }) {
  const styles = {
    edit:   'text-tl hover:bg-tl hover:text-white hover:border-tl',
    delete: 'text-mist hover:border-rs hover:text-rs',
  }[variant] ?? '';

  const Icon = variant === 'edit' ? FaPen : FaTrash;

  return (
    <button
      type="button"
      className={`btn btn-outline px-2 py-1 text-xs ${styles}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <Icon />
    </button>
  );
}

export default function Button({
  children,
  icon = '',
  variant = 'primary',
  type = 'button',
  ...props
}) {
  const variantClass =
    {
      primary: 'btn-primary',
      outline: 'btn-outline',
      danger: 'btn-danger',
    }[variant] || 'btn-primary';

  const icons = {
    create: FaPlus,
  };

  const IconComponent = typeof icon === 'string' ? icons[icon] : null;

  return (
    <button
      type={type}
      className={`btn ${variantClass} text-xs hidden md:inline-flex`.trim()}
      {...props}
    >
      {IconComponent ? <IconComponent className="text-[0.75rem]" /> : icon}
      <span>{children}</span>
    </button>
  );
}
