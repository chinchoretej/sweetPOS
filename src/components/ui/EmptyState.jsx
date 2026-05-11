import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon = <Inbox className="w-10 h-10" />,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-4 text-slate-500 dark:text-slate-400 ${className}`}
    >
      <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-4 mb-3">{icon}</div>
      <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {description && <p className="text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
