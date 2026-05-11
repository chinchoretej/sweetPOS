import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  { label, options = [], hint, error, className = '', id, ...rest },
  ref
) {
  const selectId = id || `sel-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`input ${error ? 'border-rose-400 focus:ring-rose-400' : ''}`}
        {...rest}
      >
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
});

export default Select;
