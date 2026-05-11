import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OfflineBanner from '../pwa/OfflineBanner';
import InstallPrompt from '../pwa/InstallPrompt';
import { ROUTES } from '../../constants/routes';
import { useI18n } from '../../context/I18nContext';

const TITLE_BY_PATH = (t) => ({
  [ROUTES.DASHBOARD]: t('nav.dashboard'),
  [ROUTES.BILLING]: t('nav.billing'),
  [ROUTES.PRODUCTS]: t('nav.products'),
  [ROUTES.INVENTORY]: t('nav.inventory'),
  [ROUTES.CUSTOMERS]: t('nav.customers'),
  [ROUTES.ORDERS]: t('nav.orders'),
  [ROUTES.REPORTS]: t('nav.reports'),
  [ROUTES.SETTINGS]: t('nav.settings'),
});

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t } = useI18n();

  const titles = TITLE_BY_PATH(t);
  const matched = Object.keys(titles).find((p) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );
  const title = titles[matched] || 'SweetPOS';

  return (
    <div className="min-h-screen flex bg-sweet-cream dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <OfflineBanner />
      <InstallPrompt />
    </div>
  );
}
