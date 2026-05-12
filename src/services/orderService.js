import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { shopCol, shopDoc } from './paths';
import { logInventoryChange } from './inventoryService';
import { incrementCustomerStats, upsertCustomer } from './customerService';

const COLL = 'orders';

const generateInvoiceNumber = (prefix = 'INV') => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${yy}${mm}${dd}-${rand}`;
};

/**
 * Create an order atomically within the shop's subcollection.
 * Items: [{ productId, name, qty, unit, price, total }]
 */
export const createOrder = async (shopId, {
  items,
  subtotal,
  discount,
  gst,
  total,
  paymentMode,
  customer,
  cashierId,
  notes = '',
  invoicePrefix = 'INV',
}) => {
  if (!shopId) throw new Error('shopId required');
  const invoiceNumber = generateInvoiceNumber(invoicePrefix);
  const orderRef = doc(collection(db, 'shops', shopId, COLL));

  await runTransaction(db, async (tx) => {
    const productSnaps = await Promise.all(
      items.map((it) => tx.get(shopDoc(shopId, 'products', it.productId)))
    );

    productSnaps.forEach((snap, idx) => {
      if (!snap.exists()) {
        throw new Error(`Product not found: ${items[idx].name}`);
      }
      const data = snap.data();
      const stock = Number(data.stock || 0);
      if (stock < items[idx].qty) {
        throw new Error(
          `Insufficient stock for ${items[idx].name}. Available: ${stock} ${data.unit}`
        );
      }
    });

    productSnaps.forEach((snap, idx) => {
      const data = snap.data();
      tx.update(snap.ref, {
        stock: Number(data.stock || 0) - items[idx].qty,
        soldCount: Number(data.soldCount || 0) + items[idx].qty,
        updatedAt: serverTimestamp(),
      });
    });

    tx.set(orderRef, {
      shopId,
      invoiceNumber,
      items,
      subtotal,
      discount,
      gst,
      total,
      paymentMode,
      customer: customer || null,
      cashierId: cashierId || null,
      notes,
      createdAt: serverTimestamp(),
      dateKey: new Date().toISOString().slice(0, 10),
    });
  });

  // Post-commit bookkeeping (non-transactional).
  await Promise.all(
    items.map((it) =>
      logInventoryChange(shopId, {
        productId: it.productId,
        productName: it.name,
        delta: -it.qty,
        type: 'sale',
        userId: cashierId,
        unit: it.unit,
        reason: invoiceNumber,
      })
    )
  );

  if (customer?.mobile) {
    await upsertCustomer(shopId, customer);
    await incrementCustomerStats(shopId, customer.mobile, total);
  }

  return { id: orderRef.id, invoiceNumber };
};

export const fetchOrder = async (shopId, id) => {
  if (!shopId) return null;
  const snap = await getDoc(shopDoc(shopId, COLL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeRecentOrders = (shopId, max = 50, callback) => {
  if (!shopId) {
    callback([]);
    return () => {};
  }
  const q = query(shopCol(shopId, COLL), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const fetchOrdersBetween = async (shopId, startDate, endDate) => {
  if (!shopId) return [];
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(endDate);
  const snap = await getDocs(
    query(
      shopCol(shopId, COLL),
      where('createdAt', '>=', startTs),
      where('createdAt', '<=', endTs),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchOrdersByCustomer = async (shopId, mobile) => {
  if (!shopId || !mobile) return [];
  const snap = await getDocs(
    query(
      shopCol(shopId, COLL),
      where('customer.mobile', '==', mobile),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
