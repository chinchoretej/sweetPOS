import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackagePlus, ArrowDownToLine, History } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { subscribeProducts } from '../services/productService';
import {
  restockProduct,
  adjustStock,
  subscribeInventoryLogs,
} from '../services/inventoryService';
import { friendlyDate } from '../utils/format';

const TYPE_TONE = { restock: 'success', sale: 'info', adjustment: 'warning' };

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState(null);
  const [mode, setMode] = useState('restock');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const toast = useToast();
  const { settings } = useSettings();

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
    const u2 = subscribeInventoryLogs(150, (l) => {
      setLogs(l);
      done();
    });
    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  const lowStock = useMemo(
    () =>
      products.filter(
        (p) =>
          Number(p.stock || 0) <=
          Number(p.lowStockAlert ?? settings.lowStockThreshold ?? 1)
      ),
    [products, settings.lowStockThreshold]
  );

  const dailyReport = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map();
    logs.forEach((l) => {
      const d = l.createdAt?.toDate?.() || new Date();
      if (d < today) return;
      const cur = map.get(l.productId) || {
        productId: l.productId,
        name: l.productName,
        unit: l.unit,
        sold: 0,
        restocked: 0,
        adjusted: 0,
      };
      if (l.type === 'sale') cur.sold += Math.abs(l.delta);
      else if (l.type === 'restock') cur.restocked += l.delta;
      else cur.adjusted += l.delta;
      map.set(l.productId, cur);
    });
    return Array.from(map.values());
  }, [logs]);

  const open = (product, m) => {
    setActiveProduct(product);
    setMode(m);
    setQty('');
    setReason('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numQty = Number(qty);
    if (!Number.isFinite(numQty) || numQty === 0) {
      toast.error('Enter a non-zero quantity');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'restock') {
        await restockProduct(activeProduct, Math.abs(numQty), user?.uid);
        toast.success(`Restocked ${activeProduct.name}`);
      } else {
        await adjustStock(activeProduct, numQty, reason, user?.uid);
        toast.success('Stock adjusted');
      }
      setActiveProduct(null);
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Inventory</h2>
        <p className="text-sm text-slate-500">
          Real-time stock updates, restock and adjustments.
        </p>
      </div>

      {lowStock.length > 0 && (
        <div className="card p-4 border-amber-200 dark:border-amber-500/30">
          <h3 className="font-semibold mb-2 text-amber-700 dark:text-amber-400">
            Low Stock Items ({lowStock.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} tone="warning">
                {p.name} — {p.stock} {p.unit}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand-500" /> Stock Overview
            </h3>
            <span className="text-xs text-slate-500">{products.length} products</span>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 sticky top-0 bg-white dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Stock</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={3} />
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState title="No products" />
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.category}</p>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {p.stock} {p.unit}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => open(p, 'restock')}
                            icon={<PackagePlus className="w-3.5 h-3.5" />}
                          >
                            Restock
                          </Button>
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => open(p, 'adjust')}
                            icon={<ArrowDownToLine className="w-3.5 h-3.5" />}
                          >
                            Adjust
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-brand-500" /> Recent Activity
            </h3>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-4 space-y-2">
                <TableRowSkeleton cols={1} />
                <TableRowSkeleton cols={1} />
                <TableRowSkeleton cols={1} />
              </div>
            ) : logs.length === 0 ? (
              <EmptyState title="No inventory logs yet" />
            ) : (
              logs.map((l) => (
                <div key={l.id} className="px-4 py-3 flex items-center gap-3">
                  <Badge tone={TYPE_TONE[l.type] || 'default'}>{l.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {l.productName}{' '}
                      <span
                        className={`text-xs ${
                          l.delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {l.delta > 0 ? '+' : ''}
                        {l.delta} {l.unit}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {friendlyDate(l.createdAt)} {l.reason ? `• ${l.reason}` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Today&apos;s Stock Movement</h3>
        {dailyReport.length === 0 ? (
          <EmptyState title="No movement recorded today" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Sold</th>
                  <th className="px-3 py-2 text-right">Restocked</th>
                  <th className="px-3 py-2 text-right">Adjustments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dailyReport.map((r) => (
                  <tr key={r.productId}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right text-rose-600">
                      {r.sold} {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      +{r.restocked} {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.adjusted >= 0 ? '+' : ''}
                      {r.adjusted} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!activeProduct}
        onClose={() => setActiveProduct(null)}
        title={`${mode === 'restock' ? 'Restock' : 'Adjust'} ${activeProduct?.name || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Current stock: <span className="font-semibold">{activeProduct?.stock} {activeProduct?.unit}</span>
          </div>
          <Input
            label={mode === 'restock' ? 'Quantity to add' : 'Delta (+/-)'}
            type="number"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={mode === 'restock' ? '5' : '-1.5'}
            required
          />
          {mode === 'adjust' && (
            <Input
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Spillage, correction, etc."
            />
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setActiveProduct(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {mode === 'restock' ? 'Restock' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
