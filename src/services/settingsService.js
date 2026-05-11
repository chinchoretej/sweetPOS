import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const REF = () => doc(db, 'settings', 'shop');

export const DEFAULT_SETTINGS = {
  shopName: 'SweetPOS Demo Shop',
  address: '123 Mithai Bazaar, Pune, India',
  gstNumber: '27ABCDE1234F1Z5',
  phone: '+91 90000 00000',
  currency: '₹',
  currencyCode: 'INR',
  gstPercent: 5,
  enableGst: false,
  language: 'en',
  thermalWidth: 80, // mm
  printerMode: 'a4', // 'a4' | 'thermal'
  lowStockThreshold: 1,
};

export const fetchSettings = async () => {
  if (!db) return DEFAULT_SETTINGS;
  const snap = await getDoc(REF());
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS;
};

export const saveSettings = async (settings) => {
  if (!db) {
    localStorage.setItem('sweetpos:settings', JSON.stringify(settings));
    return;
  }
  await setDoc(REF(), settings, { merge: true });
};

export const subscribeSettings = (callback) => {
  if (!db) {
    const cached = localStorage.getItem('sweetpos:settings');
    callback(cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS);
    return () => {};
  }
  return onSnapshot(REF(), (snap) =>
    callback(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS)
  );
};
