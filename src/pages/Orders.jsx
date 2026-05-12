import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Receipt, Calendar } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { subscribeRecentOrders } from '../services/orderService';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, friendlyDate, toDate } from '../utils/format';
import useDebounce from '../hooks/useDebounce';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

export default function Orders() {
  const { shopId } = useTenant();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('all');
  const [mode, setMode] = useState('all');
  const debounced = useDebounce(search, 200);
  const { settings } = useSettings();

  useEffect(() => {
    if (!shopId) return;
    const u = subscribeRecentOrders(shopId, 500, (o) => {
      setOrders(o);
      setLoading(false);
    });
    return () => u && u();
  }, [shopId]);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    const now = new Date();
    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    const startWeek = new Date(now);
    startWeek.setDate(startWeek.getDate() - 7);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders.filter((o) => {
      const d = toDate(o.createdAt);
      if (range === 'today' && (!d || d < startDay)) return false;
      if (range === 'week' && (!d || d < startWeek)) return false;
      if (range === 'month' && (!d || d < startMonth)) return false;
      if (mode !== 'all' && o.paymentMode !== mode) return false;
      if (
        term &&
        !o.invoiceNumber?.toLowerCase().includes(term) &&
        !o.customer?.name?.toLowerCase?.().includes(term) &&
        !o.customer?.mobile?.includes(term)
      )
        return false;
      return true;
    });
  }, [orders, debounced, range, mode]);

  const totals = useMemo(
    () => ({
      count: filtered.length,
      sum: filtered.reduce((s, o) => s + Number(o.total || 0), 0),
    }),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Orders</h2>
        <p className="text-sm text-slate-500">Browse, search and reprint past invoices.</p>
      </div>

      <div className="card p-3 grid sm:grid-cols-4 gap-3">
        <Input
          placeholder="Search invoice / customer…"
          leftIcon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:col-span-2"
        />
        <Select value={range} onChange={(e) => setRange(e.target.value)} options={RANGES} />
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            { value: 'all', label: 'All Payment Modes' },
            { value: 'cash', label: 'Cash' },
            { value: 'upi', label: 'UPI' },
            { value: 'card', label: 'Card' },
          ]}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-brand-500" />
          <div>
            <p className="text-xs text-slate-500">Orders in view</p>
            <p className="text-xl font-bold">{totals.count}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Receipt className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-slate-500">Total revenue</p>
            <p className="text-xl font-bold">
              {formatCurrency(totals.sum, settings.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Mode</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Receipt className="w-10 h-10" />}
                      title="No orders found"
                      description="Try changing filters or create a new bill."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/orders/${o.id}`} className="text-brand-600 hover:underline">
                        {o.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {o.customer?.name || o.customer?.mobile || (
                        <span className="text-slate-400">Walk-in</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{friendlyDate(o.createdAt)}</td>
                    <td className="px-4 py-3">{o.items?.length || 0}</td>
                    <td className="px-4 py-3">
                      <Badge tone="info">{(o.paymentMode || '').toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(o.total, settings.currency)}
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
