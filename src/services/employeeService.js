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
} from 'firebase/firestore';
import { shopCol, shopDoc, USER, USERS } from './paths';
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
 * Called from AuthContext when a phone-OTP user signs in.
 * Looks them up across all shops' employee directories and binds them.
 * If they're not in any shop, they remain unassigned.
 */
export const bindUserToShopByMobile = async (uid, mobile) => {
  const id = sanitizeMobile(mobile);
  if (!id) return null;

  // collectionGroup query is the production-correct way; for simplicity
  // we use a top-level invite mirror under `users/{uid}.pendingInvite`
  // when the super-admin invites by mobile. For shop-owner invitations
  // (the common path), we resolve through the new `users/by-mobile/{id}`
  // index doc that inviteEmployee maintains via Cloud Function in production.
  // Here we accept either: a user already linked, or no shop.
  const userSnap = await getDoc(USER(uid));
  if (userSnap.exists() && userSnap.data().shopId) return userSnap.data();

  // simple fallback: scan users collection for matching pendingInvite (small scale OK)
  const inviteSnap = await getDocs(
    query(USERS(), where('pendingInviteMobile', '==', id))
  );
  if (!inviteSnap.empty) {
    const inv = inviteSnap.docs[0].data();
    await setDoc(
      USER(uid),
      {
        uid,
        shopId: inv.shopId,
        role: inv.role || ROLES.CASHIER,
        phone: id,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  const updated = await getDoc(USER(uid));
  return updated.exists() ? updated.data() : null;
};
