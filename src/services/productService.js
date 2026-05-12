import {
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
import { storage } from './firebase';
import { shopCol, shopDoc } from './paths';

const COLL = 'products';

export const subscribeProducts = (shopId, callback) => {
  if (!shopId) {
    callback([]);
    return () => {};
  }
  const q = query(shopCol(shopId, COLL), orderBy('name'));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
};

export const fetchProducts = async (shopId) => {
  if (!shopId) return [];
  const snap = await getDocs(query(shopCol(shopId, COLL), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchProduct = async (shopId, id) => {
  if (!shopId) return null;
  const snap = await getDoc(shopDoc(shopId, COLL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const fetchProductsByCategory = async (shopId, category) => {
  if (!shopId) return [];
  const snap = await getDocs(
    query(shopCol(shopId, COLL), where('category', '==', category))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const uploadProductImage = async (shopId, file, productId) => {
  if (!storage || !file) return null;
  const path = `shops/${shopId}/products/${productId || Date.now()}_${file.name}`;
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

export const createProduct = async (shopId, data, file) => {
  const ref = await addDoc(shopCol(shopId, COLL), {
    ...data,
    shopId,
    imageUrl: null,
    imagePath: null,
    soldCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (file) {
    const img = await uploadProductImage(shopId, file, ref.id);
    if (img) {
      await updateDoc(ref, { imageUrl: img.url, imagePath: img.path });
    }
  }
  return ref.id;
};

export const updateProduct = async (shopId, id, data, file) => {
  const update = { ...data, updatedAt: serverTimestamp() };
  if (file) {
    const img = await uploadProductImage(shopId, file, id);
    if (img) {
      update.imageUrl = img.url;
      update.imagePath = img.path;
    }
  }
  await updateDoc(shopDoc(shopId, COLL, id), update);
};

export const deleteProduct = async (shopId, id, imagePath) => {
  await deleteDoc(shopDoc(shopId, COLL, id));
  if (imagePath) await deleteProductImage(imagePath);
};
