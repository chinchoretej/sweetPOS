import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activityLogService';

/**
 * Migrate v1 (single-tenant) flat collections into shops/{shopId}/...
 * Safe to re-run: each batch only commits docs that don't already
 * exist under the new path.
 */

const FLAT_COLLECTIONS = ['products', 'customers', 'orders', 'inventory_logs'];

export const detectLegacyData = async () => {
  const result = { hasLegacy: false, counts: {} };
  for (const c of FLAT_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, c), limit(1)));
    result.counts[c] = snap.size;
    if (!snap.empty) result.hasLegacy = true;
  }
  return result;
};

export const migrateFlatToShop = async (shopId, actorUid) => {
  if (!shopId) throw new Error('shopId required');
  const summary = { copied: {}, skipped: {} };

  for (const c of FLAT_COLLECTIONS) {
    const flatSnap = await getDocs(collection(db, c));
    const existingSnap = await getDocs(collection(db, 'shops', shopId, c));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    let copied = 0;
    let skipped = 0;

    // Firestore allows max 500 ops per batch
    let batch = writeBatch(db);
    let opCount = 0;
    const flushIfNeeded = async () => {
      if (opCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    for (const d of flatSnap.docs) {
      if (existingIds.has(d.id)) {
        skipped += 1;
        continue;
      }
      batch.set(doc(db, 'shops', shopId, c, d.id), {
        ...d.data(),
        shopId,
        migratedAt: serverTimestamp(),
      });
      opCount += 1;
      copied += 1;
      await flushIfNeeded();
    }
    if (opCount > 0) await batch.commit();

    summary.copied[c] = copied;
    summary.skipped[c] = skipped;
  }

  // Migrate top-level settings/shop → shops/{shopId}/settings/shop (if not already)
  try {
    const oldSettingsSnap = await getDocs(collection(db, 'settings'));
    const newSettingsSnap = await getDocs(collection(db, 'shops', shopId, 'settings'));
    const newIds = new Set(newSettingsSnap.docs.map((d) => d.id));
    const sBatch = writeBatch(db);
    let any = false;
    oldSettingsSnap.forEach((d) => {
      if (!newIds.has(d.id)) {
        sBatch.set(doc(db, 'shops', shopId, 'settings', d.id), {
          ...d.data(),
          shopId,
          migratedAt: serverTimestamp(),
        });
        any = true;
      }
    });
    if (any) await sBatch.commit();
  } catch (_) {
    /* settings collection might not exist, that's fine */
  }

  await logActivity({
    type: 'shop.migrated',
    shopId,
    actorUid,
    summary: 'Legacy v1 data migrated into shop subcollections',
    meta: summary,
  });

  return summary;
};
