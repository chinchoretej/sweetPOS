import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

// Tenant-scoped path helpers. All shop data lives under shops/{shopId}/...
// Pages obtain shopId from useTenant() and pass it explicitly to services.
const requireShop = (shopId) => {
  if (!shopId) throw new Error('shopId is required (tenant context not ready)');
  return shopId;
};

export const shopRoot = (shopId) => doc(db, 'shops', requireShop(shopId));

export const shopCol = (shopId, name) =>
  collection(db, 'shops', requireShop(shopId), name);

export const shopDoc = (shopId, name, id) =>
  doc(db, 'shops', requireShop(shopId), name, id);

// Platform / global collections (super-admin scope)
export const SHOPS = () => collection(db, 'shops');
export const SHOP = (id) => doc(db, 'shops', id);

export const USERS = () => collection(db, 'users');
export const USER = (uid) => doc(db, 'users', uid);

export const PLANS = () => collection(db, 'plans');
export const PLAN = (id) => doc(db, 'plans', id);

export const SUBSCRIPTIONS = () => collection(db, 'subscriptions');
export const SUBSCRIPTION = (shopId) => doc(db, 'subscriptions', shopId);

export const FEATURE_FLAGS = () => collection(db, 'feature_flags');
export const FEATURE_FLAG = (shopId) => doc(db, 'feature_flags', shopId);

export const ACTIVITY_LOGS = () => collection(db, 'activity_logs');
