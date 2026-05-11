import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Package,
  AlertTriangle,
  Receipt,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import { subscribeProducts } from '../services/productService';
import { subscribeRecentOrders } from '../services/orderService';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, friendlyDate, toDate } from '../utils/format';
import { ROUTES } from '../constants/routes';
import { seedSampleProducts } from '../utils/seedData';
import { useToast } from '../context/ToastContext';
import { isFirebaseConfigured } from '../services/firebase';
import Button from '../components/ui/Button';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { settings } = useSettings();
  const toast = useToast();

  useEffect(() => {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending === 0) setLoading(false);
    };
    const u1 = subscribeProducts((p) => {
      setProducts(p);
      done();
    });
    const u2 = subscribeRecentOrders(20, (o) => {
      setOrders(o);
      done();
    });
    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let todaySales = 0;
    let monthSales = 0;
    orders.forEach((o) => {
      const d = toDate(o.createdAt);
      if (!d) return;
      if (d >= today) todaySales += Number(o.total) || 0;
      if (d >= monthStart) monthSales += Number(o.total) || 0;
    });

    const lowStock = products.filter(
      (p) => Number(p.stock || 0) <= Number(p.lowStockAlert ?? settings.lowStockThreshold ?? 1)
    );

    const topSelling = [...products]
      .sort((a, b) => (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0))
      .slice(0, 5);

    return { todaySales, monthSales, lowStock, topSelling };
  }, [orders, products, settings.lowStockThreshold]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedSampleProducts();
      if (result.skipped) toast.info(result.message);
      else toast.success(`Seeded ${result.count} sample products`);
    } catch (err) {
      toast.error(err.message || 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Welcome back 👋</h2>
          <p className="text-sm text-slate-500">
            Here is what&apos;s happening at <span className="font-semibold">{settings.shopName}</span>{' '}
            today.
          </p>
        </div>
        <div className="flex gap-2">
          {isFirebaseConfigured && products.length === 0 && !loading && (
            <Button variant="secondary" onClick={handleSeed} loading={seeding} icon={<Sparkles className="w-4 h-4" />}>
              Seed sample products
            </Button>
          )}
          <Link to={ROUTES.BILLING} className="btn-primary">
            <Plus className="w-4 h-4" /> {`Quick Bill`}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<IndianRupee className="w-5 h-5" />}
            label="Sales Today"
            value={formatCurrency(stats.todaySales, settings.currency)}
            accent="emerald"
            hint={`${orders.filter((o) => {
              const d = toDate(o.createdAt);
              const t = new Date();
              t.setHours(0, 0, 0, 0);
              return d && d >= t;
            }).length} orders today`}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Sales This Month"
            value={formatCurrency(stats.monthSales, settings.currency)}
            accent="brand"
          />
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Total Products"
            value={products.length}
            accent="sky"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Low Stock"
            value={stats.lowStock.length}
            hint={stats.lowStock.length ? 'Action required' : 'All good'}
            accent={stats.lowStock.length ? 'rose' : 'emerald'}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-500" /> Recent Bills
            </h3>
            <Link to={ROUTES.ORDERS} className="text-xs text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <CardSkeleton />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No bills yet"
              description="Create your first bill from the billing counter."
              action={
                <Link to={ROUTES.BILLING} className="btn-primary">
                  <Plus className="w-4 h-4" /> Create bill
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-4">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Invoice</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">When</th>
                    <th className="px-4 py-2 text-left">Mode</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.slice(0, 8).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2 font-medium">
                        <Link to={`/orders/${o.id}`} className="text-brand-600 hover:underline">
                          {o.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{o.customer?.name || o.customer?.mobile || 'Walk-in'}</td>
                      <td className="px-4 py-2 text-slate-500">{friendlyDate(o.createdAt)}</td>
                      <td className="px-4 py-2">
                        <Badge tone="info">{(o.paymentMode || '').toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatCurrency(o.total, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Top Selling Sweets
          </h3>
          {loading ? (
            <CardSkeleton />
          ) : stats.topSelling.length === 0 ? (
            <EmptyState title="No sales data yet" description="Make a sale to see top sellers." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.topSelling.map((p, idx) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 grid place-items-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category}</p>
                  </div>
                  <Badge tone="brand">{p.soldCount || 0} sold</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {stats.lowStock.length > 0 && (
        <div className="card p-4 border-rose-200 dark:border-rose-500/30">
          <h3 className="font-semibold flex items-center gap-2 text-rose-600 mb-3">
            <AlertTriangle className="w-4 h-4" /> Low Stock Alerts
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.lowStock.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-rose-100 dark:border-rose-500/30 p-3 flex items-center justify-between bg-rose-50/50 dark:bg-rose-500/5"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.stock} {p.unit} left
                  </p>
                </div>
                <Link to={ROUTES.INVENTORY} className="btn-secondary text-xs py-1.5">
                  Restock
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
