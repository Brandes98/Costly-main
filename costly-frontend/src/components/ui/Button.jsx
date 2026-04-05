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

  const icon = {
    create: '<FaPlus className="text-[0.75rem]" />',
  };
  return (
    <button
      type={type}
      className={`btn ${variantClass} text-xs hidden md:inline-flex`.trim()}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
