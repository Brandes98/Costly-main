export default function Button({
  children,
  icon,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) {
  const variantClass = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    danger: 'btn-danger',
  }[variant] || 'btn-primary'

  const sizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: '',
  }[size] || ''

  return (
    <button type={type} className={`btn ${variantClass} ${sizeClass} ${className}`.trim()} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  )
}
