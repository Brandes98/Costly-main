import { FaPlus } from 'react-icons/fa';

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
