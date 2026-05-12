import { Link } from 'react-router-dom';
import { CreditCard, Lock, RefreshCw, LogOut } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/ui/Badge';
import { ROUTES } from '../constants/routes';
import { SHOP_STATUS, SUBSCRIPTION_STATUS } from '../constants/plans';

export default function SubscriptionGate() {
  const { shop, subscription, plan, daysRemaining } = useTenant();
  const { logout } = useAuth();

  const reason =
    shop?.status === SHOP_STATUS.SUSPENDED
      ? 'suspended'
      : shop?.status === SHOP_STATUS.ARCHIVED
      ? 'archived'
      : subscription?.status === SUBSCRIPTION_STATUS.SUSPENDED
      ? 'sub_suspended'
      : subscription?.status === SUBSCRIPTION_STATUS.CANCELLED
      ? 'cancelled'
      : 'expired';

  const messages = {
    suspended: {
      title: 'Your shop is suspended',
      desc: 'Please contact platform support to reactivate your shop.',
    },
    archived: {
      title: 'Your shop has been archived',
      desc: 'Contact support to restore access.',
    },
    sub_suspended: {
      title: 'Subscription suspended',
      desc: 'Your subscription has been suspended. Contact support to reactivate.',
    },
    cancelled: {
      title: 'Subscription cancelled',
      desc: 'Renew your plan to continue using SweetPOS.',
    },
    expired: {
      title: 'Your trial / subscription has expired',
      desc: 'Choose a plan to continue billing, inventory, and reports.',
    },
  };

  const msg = messages[reason];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sweet-cream dark:bg-slate-950">
      <div className="card max-w-md w-full p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold">{msg.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{msg.desc}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          {plan && <Badge tone="brand">Plan: {plan.name}</Badge>}
          {subscription?.status && <Badge tone="info">Status: {subscription.status}</Badge>}
          {daysRemaining > 0 && <Badge tone="warning">{daysRemaining} days remaining</Badge>}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Link to={ROUTES.DASHBOARD} className="btn-primary">
            <RefreshCw className="w-4 h-4" /> Try again
          </Link>
          <a
            href="mailto:support@sweetpos.app?subject=Renew%20my%20subscription"
            className="btn-secondary"
          >
            <CreditCard className="w-4 h-4" /> Contact billing support
          </a>
          <button onClick={logout} className="btn-ghost text-rose-500">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
