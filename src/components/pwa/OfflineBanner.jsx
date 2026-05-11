import { CloudOff } from 'lucide-react';
import useOnlineStatus from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg flex items-center gap-2 no-print">
      <CloudOff className="w-4 h-4" />
      You are offline — actions will sync when you reconnect.
    </div>
  );
}
