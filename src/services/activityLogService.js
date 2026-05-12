import {
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  where,
} from 'firebase/firestore';
import { ACTIVITY_LOGS } from './paths';

/**
 * Best-effort activity logger. Failures are swallowed so they
 * never break the user-facing action that triggered them.
 */
export const logActivity = async ({ type, actorUid = null, shopId = null, summary, meta = null }) => {
  try {
    await addDoc(ACTIVITY_LOGS(), {
      type,
      actorUid,
      shopId,
      summary,
      meta,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[SweetPOS] activity log failed:', err.message);
  }
};

export const subscribeRecentActivity = (max = 100, callback) =>
  onSnapshot(query(ACTIVITY_LOGS(), orderBy('createdAt', 'desc'), limit(max)), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const subscribeShopActivity = (shopId, max = 100, callback) =>
  onSnapshot(
    query(
      ACTIVITY_LOGS(),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc'),
      limit(max)
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
