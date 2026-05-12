import {
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  limit,
} from 'firebase/firestore';
import { shopCol, shopDoc } from './paths';

const COLL = 'customers';

const sanitizeMobile = (m) => (m || '').replace(/\D/g, '').slice(-10);

export const findCustomerByMobile = async (shopId, mobile) => {
  if (!shopId) return null;
  const id = sanitizeMobile(mobile);
  if (!id) return null;
  const snap = await getDoc(shopDoc(shopId, COLL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const upsertCustomer = async (shopId, { mobile, name = '', address = '' }) => {
  if (!shopId) return null;
  const id = sanitizeMobile(mobile);
  if (!id) return null;
  const ref = shopDoc(shopId, COLL, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await setDoc(
      ref,
      {
        name: name || existing.data().name || '',
        address: address || existing.data().address || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await setDoc(ref, {
      shopId,
      mobile: id,
      name,
      address,
      totalSpent: 0,
      orderCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return (await getDoc(ref)).data();
};

export const incrementCustomerStats = async (shopId, mobile, amount) => {
  if (!shopId) return;
  const id = sanitizeMobile(mobile);
  if (!id) return;
  await setDoc(
    shopDoc(shopId, COLL, id),
    {
      totalSpent: increment(amount),
      orderCount: increment(1),
      lastOrderAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const subscribeCustomers = (shopId, callback) => {
  if (!shopId) {
    callback([]);
    return () => {};
  }
  const q = query(shopCol(shopId, COLL), orderBy('updatedAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const searchCustomers = async (shopId, term) => {
  if (!shopId || !term) return [];
  const id = sanitizeMobile(term);
  if (id) {
    const snap = await getDoc(shopDoc(shopId, COLL, id));
    return snap.exists() ? [{ id: snap.id, ...snap.data() }] : [];
  }
  const snap = await getDocs(
    query(
      shopCol(shopId, COLL),
      where('name', '>=', term),
      where('name', '<=', term + '\uf8ff')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
