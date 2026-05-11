import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, hint, error, className = '', leftIcon, rightSlot, id, ...rest },
  ref
) {
  const inputId = id || `inp-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`input ${leftIcon ? 'pl-9' : ''} ${rightSlot ? 'pr-10' : ''} ${
            error ? 'border-rose-400 focus:ring-rose-400' : ''
          }`}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
});

export default Input;
