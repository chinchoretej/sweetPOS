import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Pause, Play, Wand2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { CardSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import { subscribeShop, setShopStatus } from '../../services/shopService';
import {
  subscribeSubscription,
  changePlan,
  setSubscriptionStatus,
  daysRemaining,
} from '../../services/subscriptionService';
import { fetchPlans } from '../../services/planService';
import { subscribeShopActivity } from '../../services/activityLogService';
import { detectLegacyData, migrateFlatToShop } from '../../services/migrationService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { friendlyDate } from '../../utils/format';
import { ROUTES } from '../../constants/routes';
import { SHOP_STATUS, SUBSCRIPTION_STATUS } from '../../constants/plans';

const SHOP_STATUS_TONE = {
  active: 'success',
  trial: 'info',
  suspended: 'danger',
  archived: 'default',
};

export default function ShopDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [shop, setShop] = useState(null);
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activity, setActivity] = useState([]);
  const [legacy, setLegacy] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [shopBusy, setShopBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    const u1 = subscribeShop(id, setShop);
    const u2 = subscribeSubscription(id, setSub);
    const u3 = subscribeShopActivity(id, 30, setActivity);
    fetchPlans().then(setPlans);
    detectLegacyData().then(setLegacy);
    return () => [u1, u2, u3].forEach((u) => u && u());
  }, [id]);

  const planOptions = useMemo(
    () => plans.map((p) => ({ value: p.id, label: `${p.name} (₹${p.monthlyPrice}/mo)` })),
    [plans]
  );

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === sub?.planId),
    [plans, sub?.planId]
  );

  const handlePlanChange = async (e) => {
    const newPlan = e.target.value;
    if (!newPlan || newPlan === sub?.planId) return;
    setPlanSaving(true);
    try {
      await changePlan(id, newPlan, user?.uid, sub?.billingCycle || 'monthly');
      toast.success(`Plan changed to ${plans.find((p) => p.id === newPlan)?.name || newPlan}`);
    } catch (err) {
      toast.error(err.message || 'Plan change failed');
    } finally {
      setPlanSaving(false);
    }
  };

  const toggleShopStatus = async () => {
    const next =
      shop?.status === SHOP_STATUS.SUSPENDED ? SHOP_STATUS.ACTIVE : SHOP_STATUS.SUSPENDED;
    setShopBusy(true);
    try {
      await setShopStatus(id, next, user?.uid);
      toast.success(`Shop ${next === SHOP_STATUS.SUSPENDED ? 'suspended' : 'activated'}`);
    } catch (err) {
      toast.error(err.message || 'Could not update shop status');
    } finally {
      setShopBusy(false);
    }
  };

  const toggleSubStatus = async () => {
    const next =
      sub?.status === SUBSCRIPTION_STATUS.SUSPENDED
        ? SUBSCRIPTION_STATUS.ACTIVE
        : SUBSCRIPTION_STATUS.SUSPENDED;
    setSubBusy(true);
    try {
      await setSubscriptionStatus(id, next, user?.uid);
      toast.success(
        `Subscription ${next === SUBSCRIPTION_STATUS.SUSPENDED ? 'suspended' : 'reactivated'}`
      );
    } catch (err) {
      toast.error(err.message || 'Could not update subscription status');
    } finally {
      setSubBusy(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    try {
      const summary = await migrateFlatToShop(id, user?.uid);
      const total = Object.values(summary.copied || {}).reduce((a, b) => a + b, 0);
      toast.success(`Migrated ${total} legacy docs`);
      setLegacy(await detectLegacyData());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMigrating(false);
    }
  };

  if (!shop) return <CardSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to={ROUTES.ADMIN_SHOPS}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-display font-bold">{shop.name}</h2>
          <p className="text-xs text-slate-500">
            ID: <code>{shop.id}</code>
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Shop</h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone={SHOP_STATUS_TONE[shop.status] || 'default'}>{shop.status}</Badge>
            {currentPlan && <Badge tone="brand">Plan: {currentPlan.name}</Badge>}
          </div>
          <p className="text-sm text-slate-500">Owner: {shop.ownerEmail || shop.ownerPhone}</p>
          <p className="text-sm text-slate-500">{shop.address || 'No address set'}</p>
          <Button
            variant="secondary"
            onClick={toggleShopStatus}
            loading={shopBusy}
            className="mt-2"
          >
            {shop.status === SHOP_STATUS.SUSPENDED ? (
              <>
                <Play className="w-4 h-4" /> Activate Shop
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Suspend Shop
              </>
            )}
          </Button>
        </div>

        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Subscription</h3>
          {!sub ? (
            <EmptyState title="No subscription record" description="Open the Subscriptions page." />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone={sub.status === 'active' ? 'success' : 'warning'}>{sub.status}</Badge>
                {currentPlan && (
                  <Badge tone="brand">
                    {currentPlan.name} · ₹{currentPlan.monthlyPrice}/mo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Period ends: {friendlyDate(sub.currentPeriodEnd)} (
                {daysRemaining(sub)} days)
              </p>
              <p className="text-sm text-slate-500">Cycle: {sub.billingCycle || 'monthly'}</p>
              <Select
                label="Change Plan"
                value={sub.planId || ''}
                onChange={handlePlanChange}
                disabled={planSaving}
                options={planOptions}
              />
              <Button
                variant="secondary"
                onClick={toggleSubStatus}
                loading={subBusy}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                {sub.status === SUBSCRIPTION_STATUS.SUSPENDED
                  ? 'Reactivate Subscription'
                  : 'Suspend Subscription'}
              </Button>
            </>
          )}
        </div>

        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Migration</h3>
          {legacy?.hasLegacy ? (
            <>
              <p className="text-sm text-slate-500">
                Detected legacy v1 collections: {Object.entries(legacy.counts || {}).map(([k, v]) => `${k}(${v})`).join(', ')}
              </p>
              <Button onClick={runMigration} loading={migrating} icon={<Wand2 className="w-4 h-4" />}>
                Migrate v1 → this shop
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-500">No legacy data to migrate.</p>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Activity</h3>
        {activity.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="py-2">
                <p className="font-medium">{a.summary}</p>
                <p className="text-[11px] text-slate-500">
                  {a.type} • {friendlyDate(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
