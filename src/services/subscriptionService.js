import {
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { SUBSCRIPTION, SUBSCRIPTIONS, SHOP } from './paths';
import {
  SUBSCRIPTION_STATUS,
  SHOP_STATUS,
  getBuiltinPlan,
  PLAN_IDS,
} from '../constants/plans';
import { logActivity } from './activityLogService';

const toTs = (v) => (v instanceof Date ? Timestamp.fromDate(v) : v);

export const upsertSubscription = async (shopId, data) => {
  // Use a client-side `Date` for `startedAt` (then convert to Timestamp)
  // so that `startedAt` and `currentPeriodEnd` always live in the same
  // time domain. Mixing serverTimestamp() with a client-calculated
  // `currentPeriodEnd` led to subtle expiry-math drift.
  const started = data.startedAt instanceof Date ? data.startedAt : new Date();
  await setDoc(
    SUBSCRIPTION(shopId),
    {
      ...data,
      shopId,
      startedAt: toTs(data.startedAt) ?? Timestamp.fromDate(started),
      currentPeriodEnd: toTs(data.currentPeriodEnd),
      trialEndsAt: toTs(data.trialEndsAt) ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const fetchSubscription = async (shopId) => {
  if (!shopId) return null;
  const snap = await getDoc(SUBSCRIPTION(shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeSubscription = (shopId, callback, onError) => {
  if (!shopId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    SUBSCRIPTION(shopId),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  );
};

export const subscribeAllSubscriptions = (callback) =>
  onSnapshot(query(SUBSCRIPTIONS()), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const fetchAllSubscriptions = async () => {
  const snap = await getDocs(SUBSCRIPTIONS());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const changePlan = async (shopId, newPlanId, actorUid, billingCycle = 'monthly') => {
  const plan = getBuiltinPlan(newPlanId);
  const days = billingCycle === 'yearly' ? 365 : 30;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await upsertSubscription(shopId, {
    planId: newPlanId,
    status: newPlanId === PLAN_IDS.TRIAL ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
    billingCycle,
    startedAt: now,
    currentPeriodEnd: periodEnd,
    paymentStatus: newPlanId === PLAN_IDS.TRIAL ? 'n/a' : 'paid',
    lastPaidAt: newPlanId === PLAN_IDS.TRIAL ? null : Timestamp.fromDate(now),
  });

  // Keep shop.status in sync with the plan, but never overwrite an
  // explicit SUSPENDED / ARCHIVED status set by the platform owner.
  try {
    const shopSnap = await getDoc(SHOP(shopId));
    if (shopSnap.exists()) {
      const cur = shopSnap.data().status;
      const patch = { planId: newPlanId, updatedAt: serverTimestamp() };
      if (newPlanId === PLAN_IDS.TRIAL && cur === SHOP_STATUS.ACTIVE) {
        patch.status = SHOP_STATUS.TRIAL;
      } else if (
        newPlanId !== PLAN_IDS.TRIAL &&
        (cur === SHOP_STATUS.TRIAL || !cur)
      ) {
        patch.status = SHOP_STATUS.ACTIVE;
      }
      await updateDoc(SHOP(shopId), patch);
    }
  } catch (e) {
    console.warn('[SweetPOS] failed to sync shop.status after plan change:', e.message);
  }

  await logActivity({
    type: 'subscription.changed',
    actorUid,
    shopId,
    summary: `Plan changed to ${plan?.name || newPlanId} (${billingCycle})`,
  });
};

export const setSubscriptionStatus = async (shopId, status, actorUid, reason = '') => {
  await upsertSubscription(shopId, { status, statusReason: reason });
  await logActivity({
    type: 'subscription.status_changed',
    actorUid,
    shopId,
    summary: `Subscription set to ${status}${reason ? `: ${reason}` : ''}`,
  });
};

export const isSubscriptionUsable = (sub) => {
  if (!sub) return false;
  const blocked = [
    SUBSCRIPTION_STATUS.SUSPENDED,
    SUBSCRIPTION_STATUS.CANCELLED,
    SUBSCRIPTION_STATUS.EXPIRED,
  ];
  if (blocked.includes(sub.status)) return false;
  const end = sub.currentPeriodEnd?.toDate?.() || sub.currentPeriodEnd;
  if (end && new Date() > new Date(end)) return false;
  return true;
};

export const daysRemaining = (sub) => {
  if (!sub) return 0;
  const end = sub.currentPeriodEnd?.toDate?.() || sub.currentPeriodEnd;
  if (!end) return 0;
  const ms = new Date(end).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};
