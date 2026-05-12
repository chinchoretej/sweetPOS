import { Menu, Sun, Moon, LogOut, Languages } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { ROLE_LABEL } from '../../permissions/roles';

export default function Topbar({ onOpenSidebar, title }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { lang, setLang, languages } = useI18n();

  const initials =
    (user?.displayName || user?.email || user?.phoneNumber || 'U')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 no-print">
      <div className="flex items-center justify-between h-16 px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-display font-bold truncate">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <Languages className="w-4 h-4 text-slate-500" />
            <select
              className="bg-transparent text-xs font-medium focus:outline-none"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              {languages.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={toggle}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <div className="w-7 h-7 rounded-full bg-brand-500 text-white grid place-items-center text-xs font-semibold">
              {initials}
            </div>
            <div className="text-xs leading-tight">
              <p className="font-semibold">
                {user?.displayName || user?.email || user?.phoneNumber}
              </p>
              <p className="text-slate-500">{ROLE_LABEL[user?.role] || 'User'}</p>
            </div>
          </div>
          <button
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
            onClick={logout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
