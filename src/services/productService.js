import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';

const COLL = 'products';

export const subscribeProducts = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLL), orderBy('name'));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const fetchProducts = async () => {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COLL), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchProduct = async (id) => {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const fetchProductsByCategory = async (category) => {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, COLL), where('category', '==', category))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const uploadProductImage = async (file, productId) => {
  if (!storage || !file) return null;
  const path = `products/${productId || Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return { url: await getDownloadURL(r), path };
};

export const deleteProductImage = async (path) => {
  if (!storage || !path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (_) {
    /* ignore missing */
  }
};

export const createProduct = async (data, file) => {
  if (!db) throw new Error('Firebase not configured');
  const ref = await addDoc(collection(db, COLL), {
    ...data,
    imageUrl: null,
    imagePath: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (file) {
    const img = await uploadProductImage(file, ref.id);
    if (img) {
      await updateDoc(ref, { imageUrl: img.url, imagePath: img.path });
    }
  }
  return ref.id;
};

export const updateProduct = async (id, data, file) => {
  if (!db) throw new Error('Firebase not configured');
  const update = { ...data, updatedAt: serverTimestamp() };
  if (file) {
    const img = await uploadProductImage(file, id);
    if (img) {
      update.imageUrl = img.url;
      update.imagePath = img.path;
    }
  }
  await updateDoc(doc(db, COLL, id), update);
};

export const deleteProduct = async (id, imagePath) => {
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COLL, id));
  if (imagePath) await deleteProductImage(imagePath);
};
