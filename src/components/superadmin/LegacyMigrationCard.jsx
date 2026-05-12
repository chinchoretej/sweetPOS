import { useEffect, useState } from 'react';
import { Wand2, AlertTriangle, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { detectLegacyData, migrateFlatToShop } from '../../services/migrationService';
import { createShop, fetchShopsByOwner } from '../../services/shopService';
import { PLAN_IDS } from '../../constants/plans';

/**
 * Shown on the Super Admin dashboard when legacy v1 flat collections
 * (top-level `products`, `orders`, etc.) still contain data. Lets the
 * platform owner pick / create a target shop and migrate in one click.
 */
export default function LegacyMigrationCard({ shops = [] }) {
  const { user } = useAuth();
  const toast = useToast();

  const [legacy, setLegacy] = useState(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create'); // 'create' | 'existing'
  const [shopName, setShopName] = useState('My Sweet Shop');
  const [targetShopId, setTargetShopId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    detectLegacyData().then(setLegacy).catch(() => setLegacy(null));
  }, []);

  // Re-check legacy when shops list changes (after a migration the counts go to 0).
  useEffect(() => {
    if (open) return;
    detectLegacyData().then(setLegacy).catch(() => {});
  }, [shops.length, open]);

  if (!legacy?.hasLegacy) return null;

  const totalLegacyDocs = Object.values(legacy.counts || {}).reduce(
    (a, b) => a + Number(b || 0),
    0
  );

  const myShops = shops.filter((s) => s.ownerUid === user?.uid);
  const ownedShopOptions = myShops.map((s) => ({ value: s.id, label: s.name }));

  const submit = async () => {
    setSubmitting(true);
    try {
      let shopId = targetShopId;

      if (mode === 'create' || !shopId) {
        if (!shopName.trim()) {
          toast.error('Shop name is required');
          setSubmitting(false);
          return;
        }
        // Use the super admin's UID as ownerUid; createShop preserves
        // their super_admin role automatically.
        shopId = await createShop({
          name: shopName.trim(),
          ownerUid: user.uid,
          ownerEmail: user.email,
          planId: PLAN_IDS.TRIAL,
          createdBy: user.uid,
        });
      }

      const summary = await migrateFlatToShop(shopId, user.uid);
      const moved = Object.values(summary.copied || {}).reduce((a, b) => a + b, 0);
      toast.success(`Migrated ${moved} v1 docs into the shop`);
      setOpen(false);
      // refresh detection
      const fresh = await detectLegacyData();
      setLegacy(fresh);
    } catch (err) {
      toast.error(err.message || 'Migration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-4 border-amber-200 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-200/70 dark:bg-amber-500/20 grid place-items-center text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Legacy v1 data detected
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {totalLegacyDocs} document{totalLegacyDocs === 1 ? '' : 's'} still live in
              top-level collections. Migrate them into a shop to make them visible in the
              new tenant-aware UI.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(legacy.counts || {})
                .filter(([, v]) => v > 0)
                .map(([k, v]) => (
                  <Badge key={k} tone="warning">
                    {k}: {v}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} icon={<Wand2 className="w-4 h-4" />}>
          Quick Migrate
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Migrate v1 data" size="md">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Pick a target shop, or create a new one. The migration is idempotent —
            re-running is safe.
          </p>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className={`flex-1 px-3 py-2 rounded-lg border ${
                mode === 'create'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => setMode('create')}
            >
              Create new shop
            </button>
            <button
              type="button"
              disabled={ownedShopOptions.length === 0}
              className={`flex-1 px-3 py-2 rounded-lg border ${
                mode === 'existing'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              } ${ownedShopOptions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => ownedShopOptions.length && setMode('existing')}
            >
              Use existing shop ({ownedShopOptions.length})
            </button>
          </div>

          {mode === 'create' ? (
            <Input
              label="Shop name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              autoFocus
            />
          ) : (
            <Select
              label="Target shop"
              value={targetShopId}
              onChange={(e) => setTargetShopId(e.target.value)}
              options={[{ value: '', label: 'Pick a shop…' }, ...ownedShopOptions]}
            />
          )}

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2 text-[11px] text-slate-500">
            ℹ The migration copies (not moves) docs — your v1 data stays in place.
            Delete it from the Firebase Console once you&apos;ve verified.
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={submitting}
              icon={<ArrowRight className="w-4 h-4" />}
              disabled={mode === 'existing' && !targetShopId}
            >
              Migrate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export const fetchLegacyMigrationOwnedShops = fetchShopsByOwner;
