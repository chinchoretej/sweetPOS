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
import { logInventoryChange } from './inventoryService';
import { incrementCustomerStats, upsertCustomer } from './customerService';

const COLL = 'orders';

const generateInvoiceNumber = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV${yy}${mm}${dd}-${rand}`;
};

/**
 * Create an order atomically:
 *  - re-reads each product
 *  - validates stock
 *  - decrements stock
 *  - writes the order document
 * Items: [{ productId, name, qty, unit, price, total }]
 */
export const createOrder = async ({
  items,
  subtotal,
  discount,
  gst,
  total,
  paymentMode,
  customer, // { mobile, name }
  cashierId,
  notes = '',
}) => {
  if (!db) throw new Error('Firebase not configured');
  const invoiceNumber = generateInvoiceNumber();
  const orderRef = doc(collection(db, COLL));

  await runTransaction(db, async (tx) => {
    const productSnaps = await Promise.all(
      items.map((it) => tx.get(doc(db, 'products', it.productId)))
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

  // post-commit (non-transactional) bookkeeping
  await Promise.all(
    items.map((it) =>
      logInventoryChange({
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
    await upsertCustomer(customer);
    await incrementCustomerStats(customer.mobile, total);
  }

  return { id: orderRef.id, invoiceNumber };
};

export const fetchOrder = async (id) => {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeRecentOrders = (max = 50, callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLL), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const fetchOrdersBetween = async (startDate, endDate) => {
  if (!db) return [];
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(endDate);
  const snap = await getDocs(
    query(
      collection(db, COLL),
      where('createdAt', '>=', startTs),
      where('createdAt', '<=', endTs),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchOrdersByCustomer = async (mobile) => {
  if (!db || !mobile) return [];
  const snap = await getDocs(
    query(
      collection(db, COLL),
      where('customer.mobile', '==', mobile),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
