export function StatCard({ icon, label, value, hint, accent = 'brand' }) {
  const accents = {
    brand: 'from-brand-500/10 to-brand-500/0 text-brand-600',
    emerald: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600',
    amber: 'from-amber-500/10 to-amber-500/0 text-amber-600',
    sky: 'from-sky-500/10 to-sky-500/0 text-sky-600',
    rose: 'from-rose-500/10 to-rose-500/0 text-rose-600',
  };
  return (
    <div className="card p-3 sm:p-4 relative overflow-hidden">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accents[accent] || accents.brand} pointer-events-none`}
      />
      <div className="relative flex items-start gap-2 sm:gap-3">
        {icon && (
          <div
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/70 dark:bg-slate-800/70 shrink-0 ${accents[accent]?.split(' ').slice(-1)}`}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">
            {label}
          </p>
          <p className="text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 break-words leading-snug">
            {value}
          </p>
          {hint && (
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
