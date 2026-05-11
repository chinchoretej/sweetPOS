import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [event, setEvent] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('sweetpos:installDismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!event || dismissed) return null;

  const install = async () => {
    event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') {
      setEvent(null);
    } else {
      localStorage.setItem('sweetpos:installDismissed', '1');
      setDismissed(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem('sweetpos:installDismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 card p-4 max-w-xs shadow-lg flex items-start gap-3 no-print animate-slide-up">
      <div className="bg-brand-100 text-brand-600 p-2 rounded-xl">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Install SweetPOS</p>
        <p className="text-xs text-slate-500 mt-1">
          Install the app for a faster, full-screen POS experience.
        </p>
        <button onClick={install} className="btn-primary mt-3 w-full text-xs py-1.5">
          Install
        </button>
      </div>
      <button
        onClick={dismiss}
        className="text-slate-400 hover:text-slate-700"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
