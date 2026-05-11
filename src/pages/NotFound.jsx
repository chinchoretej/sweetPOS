import { Link } from 'react-router-dom';
import { Candy, Home } from 'lucide-react';
import { ROUTES } from '../constants/routes';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sweet-cream dark:bg-slate-950">
      <div className="card p-8 text-center max-w-md w-full">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-amber-400 grid place-items-center text-white mb-3">
          <Candy className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-display font-extrabold">404</h1>
        <p className="text-slate-500 mt-1">
          The page you are looking for melted away. Try going back home.
        </p>
        <Link to={ROUTES.DASHBOARD} className="btn-primary mt-5 inline-flex">
          <Home className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
