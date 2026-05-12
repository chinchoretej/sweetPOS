import { useEffect, useMemo, useState } from 'react';
import { Search, Users, Phone, MapPin, ShoppingBag } from 'lucide-react';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import {
  subscribeCustomers,
  upsertCustomer,
} from '../services/customerService';
import { fetchOrdersByCustomer } from '../services/orderService';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, friendlyDate } from '../utils/format';
import useDebounce from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export default function Customers() {
  const { shopId } = useTenant();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ mobile: '', name: '', address: '' });
  const debounced = useDebounce(search, 200);
  const { settings } = useSettings();
  const toast = useToast();

  useEffect(() => {
    if (!shopId) return;
    const u = subscribeCustomers(shopId, (c) => {
      setCustomers(c);
      setLoading(false);
    });
    return () => u && u();
  }, [shopId]);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.mobile?.includes(term) ||
        c.name?.toLowerCase().includes(term) ||
        c.address?.toLowerCase().includes(term)
    );
  }, [customers, debounced]);

  const openCustomer = async (c) => {
    setActive(c);
    setActiveLoading(true);
    try {
      const orders = await fetchOrdersByCustomer(shopId, c.mobile);
      setActiveOrders(orders);
    } finally {
      setActiveLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(draft.mobile)) {
      toast.error('Mobile must be 10 digits');
      return;
    }
    try {
      await upsertCustomer(shopId, draft);
      toast.success('Customer saved');
      setCreateOpen(false);
      setDraft({ mobile: '', name: '', address: '' });
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Customers</h2>
          <p className="text-sm text-slate-500">
            Track repeat buyers and their purchase history.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Users className="w-4 h-4" />}>
          Add Customer
        </Button>
      </div>

      <div className="card p-3">
        <Input
          leftIcon={<Search className="w-4 h-4" />}
          placeholder="Search by mobile, name or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-left">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Users className="w-10 h-10" />}
                      title="No customers yet"
                      description="Customers are auto-created when you bill with a mobile number."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomer(c)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium">{c.name || '—'}</td>
                    <td className="px-4 py-3">{c.mobile}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="brand">{c.orderCount || 0}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(c.totalSpent || 0, settings.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{friendlyDate(c.lastOrderAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.name || active?.mobile || 'Customer'}
        size="lg"
      >
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge tone="info">
                <Phone className="w-3 h-3 mr-1 inline" /> {active.mobile}
              </Badge>
              {active.address && (
                <Badge>
                  <MapPin className="w-3 h-3 mr-1 inline" /> {active.address}
                </Badge>
              )}
              <Badge tone="brand">
                <ShoppingBag className="w-3 h-3 mr-1 inline" /> {active.orderCount || 0} orders
              </Badge>
              <Badge tone="success">
                Total spent: {formatCurrency(active.totalSpent || 0, settings.currency)}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm">Purchase history</h3>
            {activeLoading ? (
              <div className="space-y-2">
                <TableRowSkeleton cols={1} />
                <TableRowSkeleton cols={1} />
              </div>
            ) : activeOrders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Invoice</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Items</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-3 py-2 font-medium">{o.invoiceNumber}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {friendlyDate(o.createdAt)}
                        </td>
                        <td className="px-3 py-2">{o.items?.length || 0}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatCurrency(o.total, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Customer"
        size="sm"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            label="Mobile"
            value={draft.mobile}
            onChange={(e) =>
              setDraft({ ...draft, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            inputMode="numeric"
            required
          />
          <Input
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            label="Address (optional)"
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
