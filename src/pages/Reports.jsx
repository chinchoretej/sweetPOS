import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { TrendingUp, IndianRupee, ShoppingBag, Award, Download } from 'lucide-react';
import { StatCard } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { subscribeRecentOrders } from '../services/orderService';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, toDate } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RANGE_DAYS = { '7': 7, '30': 30, '90': 90 };

const downloadCSV = (filename, rows) => {
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const { settings } = useSettings();

  useEffect(() => {
    const u = subscribeRecentOrders(1000, (o) => {
      setOrders(o);
      setLoading(false);
    });
    return () => u && u();
  }, []);

  const days = RANGE_DAYS[range] || 30;

  const data = useMemo(() => {
    const end = new Date();
    const start = subDays(end, days - 1);
    start.setHours(0, 0, 0, 0);

    const filtered = orders.filter((o) => {
      const d = toDate(o.createdAt);
      return d && d >= start && d <= end;
    });

    const allDays = eachDayOfInterval({ start, end }).map((d) =>
      format(d, 'yyyy-MM-dd')
    );
    const dailyMap = Object.fromEntries(allDays.map((d) => [d, { sales: 0, count: 0 }]));
    filtered.forEach((o) => {
      const key = format(toDate(o.createdAt), 'yyyy-MM-dd');
      if (dailyMap[key]) {
        dailyMap[key].sales += Number(o.total || 0);
        dailyMap[key].count += 1;
      }
    });

    const labels = allDays.map((d) => format(new Date(d), 'dd MMM'));
    const sales = allDays.map((d) => Math.round(dailyMap[d].sales));
    const count = allDays.map((d) => dailyMap[d].count);

    const totalSales = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
    const totalOrders = filtered.length;
    const avgOrder = totalOrders ? totalSales / totalOrders : 0;

    const productMap = new Map();
    filtered.forEach((o) =>
      o.items?.forEach((it) => {
        const cur = productMap.get(it.productId) || {
          productId: it.productId,
          name: it.name,
          qty: 0,
          revenue: 0,
        };
        cur.qty += Number(it.qty || 0);
        cur.revenue += Number(it.total || 0);
        productMap.set(it.productId, cur);
      })
    );
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentMap = { cash: 0, upi: 0, card: 0 };
    filtered.forEach((o) => {
      paymentMap[o.paymentMode] = (paymentMap[o.paymentMode] || 0) + Number(o.total || 0);
    });

    return {
      filtered,
      labels,
      sales,
      count,
      totalSales,
      totalOrders,
      avgOrder,
      topProducts,
      paymentMap,
    };
  }, [orders, days]);

  const exportSales = () => {
    const rows = [
      ['Date', 'Orders', 'Sales'],
      ...data.labels.map((l, i) => [l, data.count[i], data.sales[i]]),
    ];
    downloadCSV(`sales-${range}d.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Reports</h2>
          <p className="text-sm text-slate-500">
            Sales, products and revenue analytics.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            className="w-40"
          />
          <Button variant="secondary" onClick={exportSales} icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<IndianRupee className="w-5 h-5" />}
              label="Total Revenue"
              value={formatCurrency(data.totalSales, settings.currency)}
              accent="emerald"
            />
            <StatCard
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Total Orders"
              value={data.totalOrders}
              accent="brand"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Avg Order"
              value={formatCurrency(data.avgOrder, settings.currency)}
              accent="sky"
            />
            <StatCard
              icon={<Award className="w-5 h-5" />}
              label="Top Sweet"
              value={data.topProducts[0]?.name || '—'}
              hint={
                data.topProducts[0]
                  ? `${formatCurrency(data.topProducts[0].revenue, settings.currency)} earned`
                  : ''
              }
              accent="amber"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card p-4 lg:col-span-2">
              <h3 className="font-semibold mb-3">Daily Sales</h3>
              <div style={{ height: 280 }}>
                <Line
                  data={{
                    labels: data.labels,
                    datasets: [
                      {
                        label: 'Sales',
                        data: data.sales,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.15)',
                        tension: 0.35,
                        fill: true,
                        pointRadius: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-3">Payment Mix</h3>
              <div style={{ height: 280 }}>
                <Doughnut
                  data={{
                    labels: ['Cash', 'UPI', 'Card'],
                    datasets: [
                      {
                        data: [
                          data.paymentMap.cash || 0,
                          data.paymentMap.upi || 0,
                          data.paymentMap.card || 0,
                        ],
                        backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b'],
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-semibold mb-3">Top 5 Products by Revenue</h3>
              {data.topProducts.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <div style={{ height: 260 }}>
                  <Bar
                    data={{
                      labels: data.topProducts.map((p) => p.name),
                      datasets: [
                        {
                          label: 'Revenue',
                          data: data.topProducts.map((p) => Math.round(p.revenue)),
                          backgroundColor: '#ec4899',
                          borderRadius: 8,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true } },
                    }}
                  />
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-3">Top Sellers Detail</h3>
              {data.topProducts.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left py-2">Product</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.topProducts.map((p) => (
                      <tr key={p.productId}>
                        <td className="py-2">{p.name}</td>
                        <td className="py-2 text-right">{p.qty.toFixed(2)}</td>
                        <td className="py-2 text-right font-semibold">
                          {formatCurrency(p.revenue, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
