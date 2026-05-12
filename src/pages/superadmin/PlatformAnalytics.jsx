import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { TrendingUp } from 'lucide-react';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { subscribeAllShops } from '../../services/shopService';
import { subscribeAllSubscriptions } from '../../services/subscriptionService';
import { fetchPlans } from '../../services/planService';
import { toDate } from '../../utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function PlatformAnalytics() {
  const [shops, setShops] = useState([]);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Shops created per month over last 6 months.
  const shopGrowth = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short' }),
        count: 0,
      });
    }
    shops.forEach((s) => {
      const d = toDate(s.createdAt);
      if (!d) return;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find((mm) => mm.key === k);
      if (m) m.count += 1;
    });
    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: 'New shops',
          data: months.map((m) => m.count),
          backgroundColor: '#f97316',
          borderRadius: 6,
        },
      ],
    };
  }, [shops]);

  const planDist = useMemo(() => {
    const map = {};
    subs.forEach((s) => {
      const k = s.planId || 'unknown';
      map[k] = (map[k] || 0) + 1;
    });
    const labels = Object.keys(map);
    const data = labels.map((k) => map[k]);
    return {
      labels: labels.map((k) => plans.find((p) => p.id === k)?.name || k),
      datasets: [
        {
          data,
          backgroundColor: ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308'],
        },
      ],
    };
  }, [subs, plans]);

  if (loading) return <CardSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <h2 className="text-2xl font-display font-bold">Platform Analytics</h2>
        </div>
        <p className="text-sm text-slate-500">Growth and plan adoption across all tenants.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Shop signups (last 6 months)</h3>
          <Bar data={shopGrowth} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Subscription mix</h3>
          {planDist.datasets[0].data.length === 0 ? (
            <p className="text-sm text-slate-500">No subscriptions yet.</p>
          ) : (
            <Doughnut data={planDist} options={{ responsive: true }} />
          )}
        </div>
      </div>
    </div>
  );
}
