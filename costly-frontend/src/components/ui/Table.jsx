import { FaSearch } from 'react-icons/fa';
import Button from './Button';
import Spinner from './Spinner';

function ToolbarSearch({ placeholder, value, onChange }) {
  return (
    <div className="flex items-center gap-2 h-8 px-3 text-xs text-mist border border-border rounded-lg bg-sur2 w-52 cursor-text">
      <FaSearch className="text-[0.75rem]" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent outline-none w-full text-ink placeholder:text-mist"
      />
    </div>
  );
}

function ToolbarFilter({ value, onChange, placeholder, options, className = 'w-40' }) {
  return (
    <select
      className={`form-input h-8 text-xs ${className}`}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TableToolbar({
  enableSearch = false,
  searchPlaceholder = 'Buscar...',
  searchValue = '',
  onSearchChange,

  showEstadoFilter = false,
  estadoValue = '',
  onEstadoChange,
  estadoOptions = [],

  showProveedorFilter = false,
  proveedorValue = '',
  onProveedorChange,
  proveedorOptions = [],

  showCreateButton = false,
  createLabel = 'Crear',
  onCreate,
  action,
}) {
  const hasToolbar =
    enableSearch || showEstadoFilter || showProveedorFilter || showCreateButton || !!action;

  if (!hasToolbar) return null;

  const toolbarAction =
    action ||
    (showCreateButton ? (
      <Button icon="create" onClick={onCreate}>
        {createLabel}
      </Button>
    ) : null);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {enableSearch && (
          <ToolbarSearch
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        )}

        {showEstadoFilter && (
          <ToolbarFilter
            value={estadoValue}
            onChange={onEstadoChange}
            placeholder="Todos los estados"
            options={estadoOptions}
          />
        )}

        {showProveedorFilter && (
          <ToolbarFilter
            value={proveedorValue}
            onChange={onProveedorChange}
            placeholder="Todos los proveedores"
            options={proveedorOptions}
            className="w-52"
          />
        )}
      </div>

      {toolbarAction}
    </div>
  );
}

export function TableCard({
  title,
  countLabel,
  children,
  actions,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No hay datos para mostrar',
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div className="flex items-center gap-3">
          {countLabel && <span className="text-[11.5px] text-mist">{countLabel}</span>}
          {actions}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : isEmpty ? (
        <TableEmpty>{emptyMessage}</TableEmpty>
      ) : (
        children
      )}
    </div>
  );
}

export function TableContainer({ children, minWidth = 'min-w-[720px]' }) {
  return (
    <div className="overflow-x-auto">
      <table className={`tbl ${minWidth}`}>{children}</table>
    </div>
  );
}

export function TableEmpty({ children }) {
  return <div className="p-12 text-center text-xs text-mist">{children}</div>;
}
