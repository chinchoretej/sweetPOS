import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  X,
  Candy,
  UserCog,
  Crown,
  Sparkles,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';
import { useI18n } from '../../context/I18nContext';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { FEATURES } from '../../permissions/features';
import { PERMS } from '../../permissions/permissions';

export default function Sidebar({ open, onClose }) {
  const { t } = useI18n();
  const { hasFeature, can, plan, daysRemaining, isSuperAdmin } = useTenant();
  const { isSuperAdmin: authSuper } = useAuth();

  const items = [
    { to: ROUTES.DASHBOARD, label: t('nav.dashboard'), icon: LayoutDashboard, end: true, show: true },
    { to: ROUTES.BILLING, label: t('nav.billing'), icon: ShoppingCart, show: hasFeature(FEATURES.BILLING) && can(PERMS.BILLING_CREATE) },
    { to: ROUTES.PRODUCTS, label: t('nav.products'), icon: Package, show: can(PERMS.PRODUCT_VIEW) },
    { to: ROUTES.INVENTORY, label: t('nav.inventory'), icon: Boxes, show: hasFeature(FEATURES.INVENTORY) && can(PERMS.INVENTORY_VIEW) },
    { to: ROUTES.CUSTOMERS, label: t('nav.customers'), icon: Users, show: can(PERMS.CUSTOMER_VIEW) },
    { to: ROUTES.ORDERS, label: t('nav.orders'), icon: Receipt, show: can(PERMS.ORDER_VIEW) },
    { to: ROUTES.REPORTS, label: t('nav.reports'), icon: BarChart3, show: hasFeature(FEATURES.REPORTS) && can(PERMS.REPORT_VIEW) },
    { to: ROUTES.EMPLOYEES, label: 'Employees', icon: UserCog, show: hasFeature(FEATURES.EMPLOYEES) && can(PERMS.EMPLOYEE_VIEW) },
    { to: ROUTES.SETTINGS, label: t('nav.settings'), icon: SettingsIcon, show: can(PERMS.SETTINGS_VIEW) },
  ].filter((i) => i.show);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden no-print transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transform transition-transform no-print flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-amber-400 grid place-items-center text-white">
              <Candy className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold leading-none">SweetPOS</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Mithai Counter</p>
            </div>
          </div>
          <button
            className="lg:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {plan && !isSuperAdmin && (
          <div className="mx-3 mt-3 rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-500/10 dark:to-amber-500/10 px-3 py-2 border border-brand-100 dark:border-brand-500/20">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-200">
              <Sparkles className="w-3 h-3" />
              {plan.name} plan
            </p>
            {daysRemaining > 0 && (
              <p className="text-[10px] text-slate-500 mt-0.5">{daysRemaining} days remaining</p>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-soft'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}

          {authSuper && (
            <Link
              to={ROUTES.ADMIN_HOME}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium bg-amber-400/15 text-amber-600 dark:text-amber-300 hover:bg-amber-400/25 mt-2"
            >
              <Crown className="w-5 h-5" />
              <span>Super Admin</span>
            </Link>
          )}
        </nav>
        <div className="p-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          v2.0 SaaS • PWA Ready
        </div>
      </aside>
    </>
  );
}
