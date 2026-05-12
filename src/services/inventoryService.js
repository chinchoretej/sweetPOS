import {
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { shopCol, shopDoc } from './paths';

const COLL = 'inventory_logs';

export const logInventoryChange = async (shopId, {
  productId,
  productName,
  delta,
  type, // 'restock' | 'sale' | 'adjustment'
  reason = '',
  userId = null,
  unit = 'kg',
}) => {
  if (!shopId) return null;
  return addDoc(shopCol(shopId, COLL), {
    shopId,
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

export const restockProduct = async (shopId, product, qty, userId) => {
  await updateDoc(shopDoc(shopId, 'products', product.id), {
    stock: increment(qty),
    updatedAt: serverTimestamp(),
  });
  await logInventoryChange(shopId, {
    productId: product.id,
    productName: product.name,
    delta: qty,
    type: 'restock',
    userId,
    unit: product.unit,
  });
};

export const adjustStock = async (shopId, product, delta, reason, userId) => {
  await updateDoc(shopDoc(shopId, 'products', product.id), {
    stock: increment(delta),
    updatedAt: serverTimestamp(),
  });
  await logInventoryChange(shopId, {
    productId: product.id,
    productName: product.name,
    delta,
    type: 'adjustment',
    reason,
    userId,
    unit: product.unit,
  });
};

export const subscribeInventoryLogs = (shopId, max = 100, callback) => {
  if (!shopId) {
    callback([]);
    return () => {};
  }
  const q = query(shopCol(shopId, COLL), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const fetchInventoryLogs = async (shopId, max = 200) => {
  if (!shopId) return [];
  const snap = await getDocs(
    query(shopCol(shopId, COLL), orderBy('createdAt', 'desc'), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
