import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Store, Pause, Play, Trash2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  subscribeAllShops,
  setShopStatus,
  hardDeleteShop,
  createShop,
} from '../../services/shopService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import { friendlyDate } from '../../utils/format';
import { SHOP_STATUS, PLAN_IDS } from '../../constants/plans';

const STATUS_TONE = {
  active: 'success',
  trial: 'info',
  suspended: 'danger',
  archived: 'default',
};

export default function Shops() {
  const { user } = useAuth();
  const toast = useToast();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 200);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    ownerEmail: '',
    ownerUid: '',
    address: '',
    planId: PLAN_IDS.TRIAL,
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const u = subscribeAllShops((s) => {
      setShops(s);
      setLoading(false);
    });
    return () => u && u();
  }, []);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return shops;
    return shops.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.ownerEmail?.toLowerCase().includes(term) ||
        s.ownerPhone?.includes(term) ||
        s.id?.toLowerCase().includes(term)
    );
  }, [shops, debounced]);

  const toggleStatus = async (shop) => {
    const next =
      shop.status === SHOP_STATUS.SUSPENDED ? SHOP_STATUS.ACTIVE : SHOP_STATUS.SUSPENDED;
    try {
      await setShopStatus(shop.id, next, user?.uid);
      toast.success(`Shop ${next}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.ownerUid.trim()) {
      toast.error('Shop name and Owner UID required');
      return;
    }
    setSubmitting(true);
    try {
      await createShop({
        name: draft.name,
        ownerUid: draft.ownerUid,
        ownerEmail: draft.ownerEmail || null,
        address: draft.address,
        planId: draft.planId,
        createdBy: user?.uid,
      });
      toast.success('Shop created');
      setCreateOpen(false);
      setDraft({ name: '', ownerEmail: '', ownerUid: '', address: '', planId: PLAN_IDS.TRIAL });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await hardDeleteShop(confirmDel.id, user?.uid);
      toast.success('Shop deleted');
      setConfirmDel(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold">Shops</h2>
          <p className="text-sm text-slate-500">
            All tenants on the SweetPOS platform.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Create Shop
        </Button>
      </div>

      <div className="card p-3">
        <Input
          leftIcon={<Search className="w-4 h-4" />}
          placeholder="Search by shop, owner email/phone, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Store className="w-10 h-10" />}
                      title="No shops match your search"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/admin/shops/${s.id}`} className="text-brand-600 hover:underline">
                        {s.name}
                      </Link>
                      <p className="text-xs text-slate-400">{s.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{s.ownerEmail || s.ownerPhone || '—'}</p>
                      <p className="text-xs text-slate-500">{s.ownerUid?.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[s.status] || 'default'}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{friendlyDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => toggleStatus(s)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={s.status === SHOP_STATUS.SUSPENDED ? 'Activate' : 'Suspend'}
                        >
                          {s.status === SHOP_STATUS.SUSPENDED ? (
                            <Play className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Pause className="w-4 h-4 text-amber-600" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDel(s)}
                          className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Shop" size="md">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            label="Shop name *"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
          />
          <Input
            label="Owner Firebase UID *"
            value={draft.ownerUid}
            onChange={(e) => setDraft({ ...draft, ownerUid: e.target.value })}
            hint="Find this in Firebase Console → Authentication → Users"
            required
          />
          <Input
            label="Owner email"
            value={draft.ownerEmail}
            onChange={(e) => setDraft({ ...draft, ownerEmail: e.target.value })}
          />
          <Input
            label="Address"
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            A 14-day Free Trial subscription will be opened automatically. The owner&apos;s
            <code className="mx-1">users/{'{uid}'}</code> doc will be patched with the new shopId
            and role <strong>shop_owner</strong>.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete shop?"
        message={`Permanently delete "${confirmDel?.name}"? Subcollections (products, orders) are NOT auto-deleted from the client — run a Cloud Function for full cleanup.`}
        confirmText="Delete"
        destructive
      />
    </div>
  );
}
