import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { subscribeAllSubscriptions, daysRemaining } from '../../services/subscriptionService';
import { subscribeAllShops } from '../../services/shopService';
import { fetchPlans } from '../../services/planService';
import useDebounce from '../../hooks/useDebounce';
import { friendlyDate } from '../../utils/format';
import { SUBSCRIPTION_STATUS } from '../../constants/plans';

const STATUS_TONE = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  cancelled: 'default',
  suspended: 'danger',
  expired: 'danger',
};

export default function Subscriptions() {
  const [shops, setShops] = useState([]);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const debounced = useDebounce(search, 200);

  useEffect(() => {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending === 0) setLoading(false);
    };
    const u1 = subscribeAllShops((s) => {
      setShops(s);
      done();
    });
    const u2 = subscribeAllSubscriptions((s) => {
      setSubs(s);
      done();
    });
    fetchPlans().then(setPlans);
    return () => [u1, u2].forEach((u) => u && u());
  }, []);

  const shopMap = useMemo(() => Object.fromEntries(shops.map((s) => [s.id, s])), [shops]);
  const planMap = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  const rows = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    return subs
      .filter((s) => (status === 'all' ? true : s.status === status))
      .filter((s) => {
        if (!term) return true;
        const shop = shopMap[s.shopId];
        return (
          shop?.name?.toLowerCase().includes(term) ||
          shop?.ownerEmail?.toLowerCase().includes(term) ||
          s.shopId?.toLowerCase().includes(term)
        );
      })
      .map((s) => ({
        ...s,
        shop: shopMap[s.shopId],
        plan: planMap[s.planId],
        days: daysRemaining(s),
      }));
  }, [subs, shopMap, planMap, debounced, status]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Subscriptions</h2>
        <p className="text-sm text-slate-500">Plans, statuses and renewals across all shops.</p>
      </div>

      <div className="card p-3 grid sm:grid-cols-[1fr_180px] gap-2">
        <Input
          leftIcon={<Search className="w-4 h-4" />}
          placeholder="Search shop name / email / id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.values(SUBSCRIPTION_STATUS).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Cycle</th>
                <th className="px-4 py-3 text-left">Period End</th>
                <th className="px-4 py-3 text-left">Days Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No subscriptions match" />
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.shopId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/admin/shops/${r.shopId}`} className="text-brand-600 hover:underline">
                        {r.shop?.name || r.shopId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.plan?.name || r.planId}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[r.status] || 'default'}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{r.billingCycle || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{friendlyDate(r.currentPeriodEnd)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={r.days <= 3 ? 'danger' : r.days <= 14 ? 'warning' : 'success'}>
                        {r.days}d
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
