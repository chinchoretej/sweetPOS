import {
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { SHOPS, SHOP, USER } from './paths';
import { SHOP_STATUS, SUBSCRIPTION_STATUS, getBuiltinPlan, PLAN_IDS } from '../constants/plans';
import { ROLES } from '../permissions/roles';
import { upsertSubscription } from './subscriptionService';
import { logActivity } from './activityLogService';

const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/**
 * Create a new shop tenant.
 * Also:
 *  - sets ownerUid on shop
 *  - patches the owner's `users/{uid}` doc with shopId + role: shop_owner
 *  - opens a Free Trial subscription
 */
export const createShop = async ({
  name,
  ownerUid,
  ownerEmail,
  ownerPhone,
  address = '',
  gstNumber = '',
  planId = PLAN_IDS.TRIAL,
  createdBy = ownerUid,
}) => {
  if (!name) throw new Error('Shop name required');
  if (!ownerUid) throw new Error('Owner UID required');

  const slug = slugify(name) || `shop-${Date.now()}`;
  const ref = await addDoc(SHOPS(), {
    name,
    slug,
    ownerUid,
    ownerEmail: ownerEmail || null,
    ownerPhone: ownerPhone || null,
    address,
    gstNumber,
    status: SHOP_STATUS.TRIAL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });

  // Bind owner → shop
  await setDoc(
    USER(ownerUid),
    {
      uid: ownerUid,
      shopId: ref.id,
      role: ROLES.SHOP_OWNER,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Open subscription (Free Trial by default)
  const plan = getBuiltinPlan(planId);
  const trialDays = plan?.trialDays || 14;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  await upsertSubscription(ref.id, {
    shopId: ref.id,
    planId,
    status: planId === PLAN_IDS.TRIAL ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
    startedAt: now,
    currentPeriodEnd: trialEnd,
    trialEndsAt: trialEnd,
  });

  await logActivity({
    type: 'shop.created',
    actorUid: createdBy,
    shopId: ref.id,
    summary: `Shop "${name}" created`,
  });

  return ref.id;
};

export const updateShop = async (shopId, patch, actorUid) => {
  await updateDoc(SHOP(shopId), { ...patch, updatedAt: serverTimestamp() });
  await logActivity({
    type: 'shop.updated',
    actorUid,
    shopId,
    summary: `Shop updated: ${Object.keys(patch).join(', ')}`,
  });
};

export const setShopStatus = async (shopId, status, actorUid) => {
  await updateDoc(SHOP(shopId), { status, updatedAt: serverTimestamp() });
  await logActivity({
    type: 'shop.status_changed',
    actorUid,
    shopId,
    summary: `Shop status set to ${status}`,
  });
};

export const deleteShop = async (shopId, actorUid) => {
  // Note: Firestore does not cascade-delete subcollections from the client.
  // For a real production app, run a Cloud Function to wipe shops/{id}/**.
  // Here we mark the shop archived and detach the owner.
  await updateDoc(SHOP(shopId), {
    status: SHOP_STATUS.ARCHIVED,
    archivedAt: serverTimestamp(),
  });
  await logActivity({
    type: 'shop.archived',
    actorUid,
    shopId,
    summary: 'Shop archived (subcollections preserved for audit)',
  });
};

export const hardDeleteShop = async (shopId, actorUid) => {
  await deleteDoc(SHOP(shopId));
  await logActivity({
    type: 'shop.deleted',
    actorUid,
    shopId,
    summary: 'Shop hard-deleted (only root doc; subcollections orphaned)',
  });
};

export const fetchShop = async (shopId) => {
  if (!shopId) return null;
  const snap = await getDoc(SHOP(shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeShop = (shopId, callback) => {
  if (!shopId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(SHOP(shopId), (snap) =>
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  );
};

export const subscribeAllShops = (callback) =>
  onSnapshot(query(SHOPS(), orderBy('createdAt', 'desc')), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const fetchShopsByOwner = async (ownerUid) => {
  const snap = await getDocs(query(SHOPS(), where('ownerUid', '==', ownerUid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
