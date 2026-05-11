import {
  collection,
  doc,
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
import { db } from './firebase';

const COLL = 'customers';

const sanitizeMobile = (m) => (m || '').replace(/\D/g, '').slice(-10);

export const findCustomerByMobile = async (mobile) => {
  if (!db) return null;
  const id = sanitizeMobile(mobile);
  if (!id) return null;
  const snap = await getDoc(doc(db, COLL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const upsertCustomer = async ({ mobile, name = '', address = '' }) => {
  if (!db) return null;
  const id = sanitizeMobile(mobile);
  if (!id) return null;
  const ref = doc(db, COLL, id);
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

export const incrementCustomerStats = async (mobile, amount) => {
  if (!db) return;
  const id = sanitizeMobile(mobile);
  if (!id) return;
  await setDoc(
    doc(db, COLL, id),
    {
      totalSpent: increment(amount),
      orderCount: increment(1),
      lastOrderAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const subscribeCustomers = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLL), orderBy('updatedAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const searchCustomers = async (term) => {
  if (!db || !term) return [];
  const id = sanitizeMobile(term);
  if (id) {
    const snap = await getDoc(doc(db, COLL, id));
    return snap.exists() ? [{ id: snap.id, ...snap.data() }] : [];
  }
  const snap = await getDocs(
    query(collection(db, COLL), where('name', '>=', term), where('name', '<=', term + '\uf8ff'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
