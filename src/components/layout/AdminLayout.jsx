import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Package2,
  ToggleRight,
  ScrollText,
  TrendingUp,
  Menu,
  X,
  Crown,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import OfflineBanner from '../pwa/OfflineBanner';
import InstallPrompt from '../pwa/InstallPrompt';
import { ROUTES } from '../../constants/routes';
import { seedBuiltinPlans } from '../../services/planService';

const NAV = [
  { to: ROUTES.ADMIN_HOME, label: 'Platform Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.ADMIN_SHOPS, label: 'Shops', icon: Store },
  { to: ROUTES.ADMIN_SUBSCRIPTIONS, label: 'Subscriptions', icon: CreditCard },
  { to: ROUTES.ADMIN_PLANS, label: 'Plans', icon: Package2 },
  { to: ROUTES.ADMIN_FEATURE_FLAGS, label: 'Feature Flags', icon: ToggleRight },
  { to: ROUTES.ADMIN_ACTIVITY, label: 'Activity Logs', icon: ScrollText },
  { to: ROUTES.ADMIN_ANALYTICS, label: 'Analytics', icon: TrendingUp },
];

const TITLE_BY_PATH = {
  [ROUTES.ADMIN_HOME]: 'Platform Dashboard',
  [ROUTES.ADMIN_SHOPS]: 'Shops',
  [ROUTES.ADMIN_SUBSCRIPTIONS]: 'Subscriptions',
  [ROUTES.ADMIN_PLANS]: 'Plans',
  [ROUTES.ADMIN_FEATURE_FLAGS]: 'Feature Flags',
  [ROUTES.ADMIN_ACTIVITY]: 'Activity Logs',
  [ROUTES.ADMIN_ANALYTICS]: 'Platform Analytics',
};

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  // One-shot: seed built-in plans the first time a super admin opens the panel.
  useEffect(() => {
    seedBuiltinPlans().catch(() => {});
  }, []);

  const matchedKey = Object.keys(TITLE_BY_PATH).find((p) =>
    p === ROUTES.ADMIN_HOME ? location.pathname === p : location.pathname.startsWith(p)
  );
  const title = TITLE_BY_PATH[matchedKey] || 'Super Admin';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <div
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden no-print transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-slate-900 text-slate-100 border-r border-slate-800 transform transition-transform no-print flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center text-white">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold leading-none">SweetPOS</p>
              <p className="text-[10px] text-amber-400 leading-none mt-0.5 font-semibold">
                SUPER ADMIN
              </p>
            </div>
          </div>
          <button
            className="lg:hidden p-1 rounded hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-amber-400 text-slate-900 shadow-soft'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500">
          v2.0 SaaS · {user?.email || user?.phoneNumber}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 no-print">
          <div className="flex items-center justify-between h-16 px-3 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base sm:text-lg font-display font-bold truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={toggle}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
        <OfflineBanner />
        <InstallPrompt />
      </div>
    </div>
  );
}
