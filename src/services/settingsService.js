import { getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { shopDoc } from './paths';

const SETTINGS_DOC = 'shop';

export const DEFAULT_SETTINGS = {
  shopName: 'My Sweet Shop',
  address: '',
  gstNumber: '',
  phone: '',
  upiId: '',
  currency: '₹',
  currencyCode: 'INR',
  gstPercent: 5,
  enableGst: false,
  language: 'en',
  thermalWidth: 80,
  printerMode: 'a4',
  lowStockThreshold: 1,
  invoicePrefix: 'INV',
};

export const fetchSettings = async (shopId) => {
  if (!shopId) return DEFAULT_SETTINGS;
  const snap = await getDoc(shopDoc(shopId, 'settings', SETTINGS_DOC));
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS;
};

export const saveSettings = async (shopId, settings) => {
  if (!shopId) {
    localStorage.setItem('sweetpos:settings', JSON.stringify(settings));
    return;
  }
  await setDoc(shopDoc(shopId, 'settings', SETTINGS_DOC), { ...settings, shopId }, { merge: true });
};

export const subscribeSettings = (shopId, callback) => {
  if (!shopId) {
    const cached = localStorage.getItem('sweetpos:settings');
    callback(cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS);
    return () => {};
  }
  return onSnapshot(shopDoc(shopId, 'settings', SETTINGS_DOC), (snap) =>
    callback(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS)
  );
};
