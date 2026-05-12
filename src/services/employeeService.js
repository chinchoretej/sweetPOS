import {
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  collectionGroup,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';
import { shopCol, shopDoc, USER } from './paths';
import { ROLES } from '../permissions/roles';
import { logActivity } from './activityLogService';

const COLL = 'employees';

/**
 * In this MVP, "employees" is a per-shop directory of invited users.
 * The actual Firebase Auth account is created when they first log in
 * via OTP — we look them up by mobile and bind them to the shop.
 *
 * The `employees/{mobile}` doc stores the role they will receive.
 * `users/{uid}` is the source of truth at runtime.
 */

const sanitizeMobile = (m) => (m || '').replace(/\D/g, '').slice(-10);

export const subscribeEmployees = (shopId, callback) => {
  if (!shopId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(query(shopCol(shopId, COLL), orderBy('createdAt', 'desc')), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const inviteEmployee = async (shopId, { mobile, name = '', role = ROLES.CASHIER }, actorUid) => {
  const id = sanitizeMobile(mobile);
  if (!id) throw new Error('Valid 10-digit mobile required');
  if (!Object.values(ROLES).includes(role)) throw new Error('Invalid role');

  await setDoc(
    shopDoc(shopId, COLL, id),
    {
      shopId,
      mobile: id,
      name,
      role,
      status: 'invited',
      invitedBy: actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await logActivity({
    type: 'employee.invited',
    actorUid,
    shopId,
    summary: `Invited ${name || id} as ${role}`,
  });
};

export const updateEmployee = async (shopId, mobile, patch, actorUid) => {
  const id = sanitizeMobile(mobile);
  await setDoc(
    shopDoc(shopId, COLL, id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await logActivity({
    type: 'employee.updated',
    actorUid,
    shopId,
    summary: `Employee ${id} updated`,
  });
};

export const removeEmployee = async (shopId, mobile, actorUid) => {
  const id = sanitizeMobile(mobile);
  await deleteDoc(shopDoc(shopId, COLL, id));
  await logActivity({
    type: 'employee.removed',
    actorUid,
    shopId,
    summary: `Employee ${id} removed`,
  });
};

/**
 * Find any pending employee invites for a given mobile across ALL shops.
 * Uses a collectionGroup query — relies on a single-field collection-group
 * index on the `mobile` field (configured in firebase/firestore.indexes.json).
 */
export const findInvitesByMobile = async (mobile) => {
  const id = sanitizeMobile(mobile);
  if (!id || !db) return [];
  const snap = await getDocs(
    query(collectionGroup(db, COLL), where('mobile', '==', id))
  );
  return snap.docs.map((d) => ({
    ...d.data(),
    _path: d.ref.path,
    // d.ref.parent is the employees collection; .parent is the shop doc.
    shopId: d.ref.parent.parent?.id || d.data().shopId,
  }));
};

/**
 * Auto-bind a freshly-authenticated phone-OTP user to a shop they were
 * invited to. Idempotent and safe to call on every login.
 *
 * Rules:
 *   - If the user already has a shopId, do nothing (don't move them).
 *   - If the user is a super_admin, do nothing.
 *   - Take the most recent invite if multiple exist.
 *   - Stamp the user doc with the invite's shopId + role.
 *   - Mark the invite doc as active and link the user's uid.
 */
export const bindUserToShopByMobile = async (uid, mobile) => {
  if (!uid || !db) return null;
  const id = sanitizeMobile(mobile);
  if (!id) return null;

  const userSnap = await getDoc(USER(uid));
  const userData = userSnap.exists() ? userSnap.data() : null;

  // Don't override an existing membership or super-admin role.
  if (userData?.shopId) return null;
  if (userData?.role === ROLES.SUPER_ADMIN) return null;

  const invites = await findInvitesByMobile(id);
  if (invites.length === 0) return null;

  // Prefer the most recently created invite when there are multiples.
  invites.sort((a, b) => {
    const aT = a.createdAt?.toMillis?.() || 0;
    const bT = b.createdAt?.toMillis?.() || 0;
    return bT - aT;
  });
  const invite = invites[0];

  // Bind the user → shop with the invited role.
  await setDoc(
    USER(uid),
    {
      uid,
      shopId: invite.shopId,
      role: invite.role || ROLES.CASHIER,
      phone: id,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Mark the invite as active. Done best-effort — if rules deny it (e.g.
  // the user's auth token is missing the phone claim) we still consider
  // the bind successful and just log a warning.
  try {
    await setDoc(
      doc(db, invite._path),
      {
        status: 'active',
        uid,
        acceptedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[SweetPOS] could not mark invite active:', err.message);
  }

  return invite;
};
