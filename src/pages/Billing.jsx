import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  RotateCcw,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  Keyboard,
  User,
  Package,
} from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import InvoiceView from '../components/billing/InvoiceView';
import useDebounce from '../hooks/useDebounce';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import useCartStore from '../store/cartStore';
import { subscribeProducts } from '../services/productService';
import { createOrder, fetchOrder } from '../services/orderService';
import { findCustomerByMobile } from '../services/customerService';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/format';
import { downloadInvoicePdf, printInvoiceWindow } from '../utils/invoice';
import { shareOnWhatsApp } from '../utils/whatsapp';
import { isValidIndianMobile } from '../utils/validators';
import { PAYMENT_MODES } from '../constants/categories';
import { BILLING_SHORTCUTS } from '../constants/shortcuts';

const PAY_ICON = {
  cash: <Banknote className="w-4 h-4" />,
  upi: <Smartphone className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
};

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debounced = useDebounce(search, 150);
  const searchRef = useRef(null);
  const customerRef = useRef(null);

  const { settings } = useSettings();
  const { user } = useAuth();
  const toast = useToast();

  const cart = useCartStore();
  const totals = cart.totals();

  useEffect(() => {
    const u = subscribeProducts((p) => {
      setProducts(p);
      setLoading(false);
    });
    return () => u && u();
  }, []);

  useEffect(() => {
    if (settings) {
      cart.setEnableGst(!!settings.enableGst);
      cart.setGstPercent(Number(settings.gstPercent) || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enableGst, settings.gstPercent]);

  const filteredProducts = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase?.() === term
    );
  }, [products, debounced]);

  const handleLookupCustomer = async () => {
    const mobile = cart.customer.mobile;
    if (!mobile) return;
    if (!isValidIndianMobile(mobile)) {
      toast.warning('Mobile must be 10 digits');
      return;
    }
    try {
      const c = await findCustomerByMobile(mobile);
      if (c) {
        cart.setCustomer({ name: c.name || '', address: c.address || '' });
        toast.success(`Found returning customer: ${c.name || mobile}`);
      } else {
        toast.info('New customer — will be saved with this bill');
      }
    } catch (err) {
      toast.error(err.message || 'Lookup failed');
    }
  };

  const submitOrder = async () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (cart.customer.mobile && !isValidIndianMobile(cart.customer.mobile)) {
      toast.error('Customer mobile must be 10 digits');
      return;
    }
    setSubmitting(true);
    try {
      const items = cart.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        unit: it.unit,
        qty: Number(it.qty),
        price: Number(it.price),
        total: Number(it.total),
      }));
      const result = await createOrder({
        items,
        subtotal: totals.subtotal,
        discount: totals.discountAbs,
        gst: totals.gst,
        total: totals.total,
        paymentMode: cart.paymentMode,
        customer: cart.customer.mobile ? { ...cart.customer } : null,
        cashierId: user?.uid,
        notes: cart.notes,
      });

      const created = await fetchOrder(result.id);
      setSavedOrder(created || { ...result, items, total: totals.total, subtotal: totals.subtotal, discount: totals.discountAbs, gst: totals.gst, paymentMode: cart.paymentMode, customer: cart.customer, createdAt: new Date() });
      cart.reset();
      setPaymentOpen(false);
      toast.success('Order saved successfully');
    } catch (err) {
      toast.error(err.message || 'Could not save order');
    } finally {
      setSubmitting(false);
    }
  };

  useKeyboardShortcuts(
    [
      { combo: 'alt+n', handler: () => searchRef.current?.focus() },
      { combo: 'alt+c', handler: () => customerRef.current?.focus() },
      { combo: 'alt+p', handler: () => cart.items.length && setPaymentOpen(true) },
      { combo: 'alt+r', handler: () => cart.reset() },
      { combo: 'escape', handler: () => { setPaymentOpen(false); setShortcutOpen(false); } },
    ],
    true
  );

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Billing Counter</h2>
          <p className="text-sm text-slate-500">Add items, collect payment, print invoice.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<Keyboard className="w-4 h-4" />} onClick={() => setShortcutOpen(true)}>
            Shortcuts
          </Button>
          <Button variant="secondary" icon={<RotateCcw className="w-4 h-4" />} onClick={cart.reset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Product picker */}
        <div className="lg:col-span-3 space-y-3">
          <div className="card p-3">
            <Input
              ref={searchRef}
              placeholder="Search products by name, category or barcode  (Alt+N)"
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No products found"
              description="Try a different search or add new products."
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[68vh] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const outOfStock = Number(p.stock || 0) <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => cart.addItem(p, 1)}
                    className={`card text-left p-3 hover:shadow-soft transition flex gap-3 items-center ${
                      outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden grid place-items-center flex-shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.category}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold text-brand-600">
                          {formatCurrency(p.price, settings.currency)}
                          <span className="text-xs text-slate-500">/{p.unit}</span>
                        </span>
                        <Badge tone={outOfStock ? 'danger' : 'default'}>
                          {p.stock} {p.unit}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card p-3">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-brand-500" /> Customer
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Input
                ref={customerRef}
                placeholder="Mobile (Alt+C)"
                value={cart.customer.mobile}
                onChange={(e) =>
                  cart.setCustomer({ mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
                onBlur={handleLookupCustomer}
                inputMode="numeric"
              />
              <Input
                placeholder="Name"
                value={cart.customer.name}
                onChange={(e) => cart.setCustomer({ name: e.target.value })}
              />
            </div>
          </div>

          <div className="card flex flex-col max-h-[55vh]">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-brand-500" /> Cart
              </h3>
              <Badge tone="brand">{cart.items.length} items</Badge>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {cart.items.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="w-10 h-10" />}
                  title="Cart is empty"
                  description="Tap a product on the left to add it."
                  className="py-8"
                />
              ) : (
                cart.items.map((it) => (
                  <div key={it.productId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{it.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(it.price, settings.currency)} / {it.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => cart.removeItem(it.productId)}
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1 rounded"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() =>
                            cart.updateQty(it.productId, Math.max(0, it.qty - (it.unit === 'kg' ? 0.25 : 1)))
                          }
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step={it.unit === 'kg' ? '0.001' : '1'}
                          value={it.qty}
                          onChange={(e) => cart.updateQty(it.productId, e.target.value)}
                          className="w-16 text-center bg-transparent text-sm font-medium focus:outline-none"
                        />
                        <button
                          onClick={() =>
                            cart.updateQty(it.productId, it.qty + (it.unit === 'kg' ? 0.25 : 1))
                          }
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatCurrency(it.total, settings.currency)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-[10px]">Discount</label>
                  <div className="flex">
                    <input
                      type="number"
                      min="0"
                      value={cart.discount}
                      onChange={(e) => cart.setDiscount(e.target.value, cart.discountType)}
                      className="input rounded-r-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        cart.setDiscount(
                          cart.discount,
                          cart.discountType === 'flat' ? 'percent' : 'flat'
                        )
                      }
                      className="px-3 rounded-r-xl border border-l-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                      title="Toggle flat / percent"
                    >
                      {cart.discountType === 'flat' ? settings.currency || '₹' : '%'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label text-[10px] flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="accent-brand-500"
                      checked={cart.enableGst}
                      onChange={(e) => cart.setEnableGst(e.target.checked)}
                    />
                    GST {cart.gstPercent}%
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cart.gstPercent}
                    onChange={(e) => cart.setGstPercent(Number(e.target.value))}
                    className="input"
                    disabled={!cart.enableGst}
                  />
                </div>
              </div>

              <div className="text-sm space-y-1 pt-2">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal, settings.currency)}</span>
                </div>
                {totals.discountAbs > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discountAbs, settings.currency)}</span>
                  </div>
                )}
                {totals.gst > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>GST</span>
                    <span>{formatCurrency(totals.gst, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total, settings.currency)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={cart.items.length === 0}
                onClick={() => setPaymentOpen(true)}
                icon={<CreditCard className="w-4 h-4" />}
              >
                Collect Payment (Alt+P)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Collect Payment"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs text-slate-500">Amount due</p>
            <p className="text-3xl font-bold">{formatCurrency(totals.total, settings.currency)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => cart.setPaymentMode(m.value)}
                className={`card p-3 flex flex-col items-center gap-1 transition ${
                  cart.paymentMode === m.value
                    ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : ''
                }`}
              >
                {PAY_ICON[m.value]}
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input min-h-[60px]"
              value={cart.notes}
              onChange={(e) => cart.setNotes(e.target.value)}
              placeholder="Anything to remember about this order…"
            />
          </div>
          <Button className="w-full" loading={submitting} onClick={submitOrder} icon={<CheckCircle2 className="w-4 h-4" />}>
            Confirm & Save
          </Button>
        </div>
      </Modal>

      {/* Invoice success modal */}
      <Modal
        open={!!savedOrder}
        onClose={() => setSavedOrder(null)}
        title="Order Saved"
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2 justify-end no-print">
            <Button variant="secondary" onClick={() => shareOnWhatsApp(savedOrder, settings)} icon={<Share2 className="w-4 h-4" />}>
              WhatsApp
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadInvoicePdf(savedOrder, settings)}
              icon={<Download className="w-4 h-4" />}
            >
              PDF
            </Button>
            <Button onClick={printInvoiceWindow} icon={<Printer className="w-4 h-4" />}>
              Print
            </Button>
          </div>
        }
      >
        {savedOrder && (
          <InvoiceView order={savedOrder} settings={settings} mode={settings.printerMode} />
        )}
      </Modal>

      {/* Shortcuts modal */}
      <Modal open={shortcutOpen} onClose={() => setShortcutOpen(false)} title="Keyboard Shortcuts" size="sm">
        <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
          {BILLING_SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex justify-between py-2">
              <span>{s.label}</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
