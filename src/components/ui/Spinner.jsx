import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '' }) {
  return <Loader2 className={`w-5 h-5 animate-spin text-brand-500 ${className}`} />;
}

export function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="w-10 h-10" />
    </div>
  );
}
