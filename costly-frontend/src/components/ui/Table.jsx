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

function ToolbarSwitch({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-mist">
      <div
        className={`relative w-8 h-4 rounded-full transition-colors ${value ? 'bg-tl' : 'bg-border'}`}
        onClick={() => onChange(!value)}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label}
    </label>
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
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',

  // [{ value, onChange, options, placeholder, className? }]
  filters = [],

  // [{ label, value, onChange }]
  switches = [],

  createLabel = 'Crear',
  onCreate,
  action,
}) {
  const hasSearch = typeof onSearchChange === 'function';
  const hasCreateAction = typeof onCreate === 'function';

  const toolbarAction =
    action ||
    (hasCreateAction ? (
      <Button icon="create" onClick={onCreate}>
        {createLabel}
      </Button>
    ) : null);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {hasSearch && (
          <ToolbarSearch
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
          />
        )}

        {filters.map((f, i) => (
          <ToolbarFilter
            key={i}
            value={f.value}
            onChange={f.onChange}
            placeholder={f.placeholder ?? 'Todos'}
            options={f.options}
            className={f.className}
          />
        ))}

        {switches.map((s, i) => (
          <ToolbarSwitch key={i} label={s.label} value={s.value} onChange={s.onChange} />
        ))}
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
