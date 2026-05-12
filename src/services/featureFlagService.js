import {
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { FEATURE_FLAG } from './paths';
import { logActivity } from './activityLogService';

export const fetchFeatureFlags = async (shopId) => {
  if (!shopId) return null;
  const snap = await getDoc(FEATURE_FLAG(shopId));
  return snap.exists() ? snap.data() : null;
};

export const subscribeFeatureFlags = (shopId, callback, onError) => {
  if (!shopId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    FEATURE_FLAG(shopId),
    (snap) => callback(snap.exists() ? snap.data() : null),
    onError
  );
};

export const setFeatureFlag = async (shopId, key, enabled, actorUid) => {
  await setDoc(
    FEATURE_FLAG(shopId),
    {
      shopId,
      features: { [key]: enabled },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logActivity({
    type: 'feature_flag.toggled',
    actorUid,
    shopId,
    summary: `Feature "${key}" ${enabled ? 'enabled' : 'disabled'}`,
    meta: { key, enabled },
  });
};

export const setFeatureFlags = async (shopId, features, actorUid) => {
  await setDoc(
    FEATURE_FLAG(shopId),
    {
      shopId,
      features,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logActivity({
    type: 'feature_flag.bulk_set',
    actorUid,
    shopId,
    summary: 'Feature flags updated',
    meta: features,
  });
};
