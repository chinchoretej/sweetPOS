import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, CreditCard, IndianRupee, Activity, Crown, ArrowRight } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import { CardSkeleton } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LegacyMigrationCard from '../../components/superadmin/LegacyMigrationCard';
import { subscribeAllShops } from '../../services/shopService';
import { subscribeAllSubscriptions } from '../../services/subscriptionService';
import { subscribeRecentActivity } from '../../services/activityLogService';
import { fetchPlans } from '../../services/planService';
import { friendlyDate } from '../../utils/format';
import { ROUTES } from '../../constants/routes';
import { SUBSCRIPTION_STATUS, SHOP_STATUS } from '../../constants/plans';

const STATUS_TONE = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  cancelled: 'default',
  suspended: 'danger',
  expired: 'danger',
};

export default function PlatformDashboard() {
  const [shops, setShops] = useState([]);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending === 0) setLoading(false);
    };
    const unsubs = [];
    unsubs.push(
      subscribeAllShops((s) => {
        setShops(s);
        done();
      })
    );
    unsubs.push(
      subscribeAllSubscriptions((s) => {
        setSubs(s);
        done();
      })
    );
    unsubs.push(
      subscribeRecentActivity(10, (a) => {
        setActivity(a);
        done();
      })
    );
    fetchPlans().then(setPlans).catch(() => {});
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const stats = useMemo(() => {
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));
    const activeSubs = subs.filter(
      (s) => s.status === SUBSCRIPTION_STATUS.ACTIVE || s.status === SUBSCRIPTION_STATUS.TRIAL
    );
    const monthlyRevenue = subs.reduce((sum, s) => {
      if (s.status !== SUBSCRIPTION_STATUS.ACTIVE) return sum;
      const plan = planMap[s.planId];
      if (!plan) return sum;
      return sum + (s.billingCycle === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice);
    }, 0);
    const activeShops = shops.filter((s) => s.status !== SHOP_STATUS.SUSPENDED && s.status !== SHOP_STATUS.ARCHIVED).length;
    return {
      totalShops: shops.length,
      activeShops,
      activeSubs: activeSubs.length,
      monthlyRevenue,
    };
  }, [shops, subs, plans]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500 shrink-0" />
          <h2 className="text-xl sm:text-2xl font-display font-bold truncate">
            Platform Overview
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">All your tenants at a glance.</p>
      </div>

      <LegacyMigrationCard shops={shops} />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Store className="w-5 h-5" />}
            label="Total Shops"
            value={stats.totalShops}
            hint={`${stats.activeShops} active`}
            accent="brand"
          />
          <StatCard
            icon={<CreditCard className="w-5 h-5" />}
            label="Active Subs"
            value={stats.activeSubs}
            accent="emerald"
          />
          <StatCard
            icon={<IndianRupee className="w-5 h-5" />}
            label="MRR (est.)"
            value={`₹${Math.round(stats.monthlyRevenue).toLocaleString('en-IN')}`}
            hint="Monthly recurring"
            accent="amber"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Plans"
            value={plans.length}
            accent="sky"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-3 sm:p-4 lg:col-span-2 overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-semibold truncate">Recent Shops</h3>
            <Link
              to={ROUTES.ADMIN_SHOPS}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1 shrink-0"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <CardSkeleton />
          ) : shops.length === 0 ? (
            <EmptyState title="No shops yet" description="Once shops sign up they'll appear here." />
          ) : (
            <div className="overflow-x-auto -mx-3 sm:-mx-4">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="text-[10px] sm:text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left">Shop</th>
                    <th className="hidden sm:table-cell px-2 sm:px-4 py-2 text-left">Owner</th>
                    <th className="px-2 sm:px-4 py-2 text-left">Status</th>
                    <th className="hidden sm:table-cell px-2 sm:px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shops.slice(0, 6).map((s) => (
                    <tr key={s.id}>
                      <td className="px-2 sm:px-4 py-2 font-medium max-w-[160px] sm:max-w-none">
                        <Link
                          to={`/admin/shops/${s.id}`}
                          className="text-brand-600 hover:underline block truncate"
                        >
                          {s.name}
                        </Link>
                        <span className="block sm:hidden text-[10px] text-slate-500 truncate">
                          {s.ownerEmail || s.ownerPhone || '—'} · {friendlyDate(s.createdAt)}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 text-slate-500 max-w-[180px] truncate">
                        {s.ownerEmail || s.ownerPhone || '—'}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <Badge tone={STATUS_TONE[s.status] || 'default'}>{s.status}</Badge>
                      </td>
                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 text-slate-500">
                        {friendlyDate(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 sm:p-4 overflow-hidden min-w-0">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          {loading ? (
            <CardSkeleton />
          ) : activity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="py-2 min-w-0">
                  <p className="font-medium break-words">{a.summary}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {a.type} • {friendlyDate(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
