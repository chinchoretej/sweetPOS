import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

const COLL = 'inventory_logs';

export const logInventoryChange = async ({
  productId,
  productName,
  delta,
  type, // 'restock' | 'sale' | 'adjustment'
  reason = '',
  userId = null,
  unit = 'kg',
}) => {
  if (!db) return null;
  return addDoc(collection(db, COLL), {
    productId,
    productName,
    delta,
    type,
    reason,
    userId,
    unit,
    createdAt: serverTimestamp(),
  });
};

export const restockProduct = async (product, qty, userId) => {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, 'products', product.id), {
    stock: increment(qty),
    updatedAt: serverTimestamp(),
  });
  await logInventoryChange({
    productId: product.id,
    productName: product.name,
    delta: qty,
    type: 'restock',
    userId,
    unit: product.unit,
  });
};

export const adjustStock = async (product, delta, reason, userId) => {
  if (!db) throw new Error('Firebase not configured');
  await updateDoc(doc(db, 'products', product.id), {
    stock: increment(delta),
    updatedAt: serverTimestamp(),
  });
  await logInventoryChange({
    productId: product.id,
    productName: product.name,
    delta,
    type: 'adjustment',
    reason,
    userId,
    unit: product.unit,
  });
};

export const subscribeInventoryLogs = (max = 100, callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLL), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const fetchInventoryLogs = async (max = 200) => {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, COLL), orderBy('createdAt', 'desc'), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
