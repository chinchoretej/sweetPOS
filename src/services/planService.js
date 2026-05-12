import {
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { PLANS, PLAN } from './paths';
import { BUILTIN_PLANS } from '../constants/plans';

export const seedBuiltinPlans = async () => {
  const existing = await getDocs(PLANS());
  if (!existing.empty) return { skipped: true, count: existing.size };
  const batch = writeBatch(db);
  BUILTIN_PLANS.forEach((p) => {
    batch.set(PLAN(p.id), {
      ...p,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return { skipped: false, count: BUILTIN_PLANS.length };
};

export const fetchPlans = async () => {
  const snap = await getDocs(query(PLANS(), orderBy('monthlyPrice')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchPlan = async (id) => {
  if (!id) return null;
  const snap = await getDoc(PLAN(id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribePlans = (callback) =>
  onSnapshot(query(PLANS(), orderBy('monthlyPrice')), (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

export const upsertPlan = async (id, data) => {
  await setDoc(
    PLAN(id),
    { ...data, id, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const updatePlan = async (id, patch) => {
  await updateDoc(PLAN(id), { ...patch, updatedAt: serverTimestamp() });
};

export const deletePlan = async (id) => {
  await deleteDoc(PLAN(id));
};
