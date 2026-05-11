import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const DEV_ADMIN_PASSWORD =
  import.meta.env.VITE_DEV_ADMIN_PASSWORD || 'admin123';

/* ------------------------- helpers ------------------------- */

const ensureUserDoc = async (user, extra = {}) => {
  if (!db || !user) return null;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const isAdmin =
    extra.role === 'admin' ||
    (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      phone: user.phoneNumber || null,
      email: user.email || null,
      displayName: user.displayName || extra.displayName || null,
      role: isAdmin ? 'admin' : 'cashier',
      createdAt: serverTimestamp(),
      ...extra,
    });
  } else if (isAdmin && snap.data().role !== 'admin') {
    await setDoc(ref, { role: 'admin' }, { merge: true });
  }
  return (await getDoc(ref)).data();
};

/* ----------------------- mobile OTP ----------------------- */

export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (!auth) throw new Error('Firebase not configured');
  if (window.__sweetposRecaptcha) {
    try {
      window.__sweetposRecaptcha.clear();
    } catch (_) {
      /* noop */
    }
  }
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  window.__sweetposRecaptcha = verifier;
  return verifier;
};

export const sendOtp = async (mobileNumber, recaptchaVerifier) => {
  if (!auth) throw new Error('Firebase not configured');
  // Normalize: prepend +91 if not present (India default).
  const phone = mobileNumber.startsWith('+')
    ? mobileNumber
    : `+91${mobileNumber.replace(/\D/g, '')}`;
  const confirmation = await signInWithPhoneNumber(
    auth,
    phone,
    recaptchaVerifier
  );
  return confirmation;
};

export const verifyOtp = async (confirmation, otp) => {
  const result = await confirmation.confirm(otp);
  await ensureUserDoc(result.user);
  return result.user;
};

/* ----------------------- admin login ----------------------- */

export const adminLogin = async (email, password) => {
  if (!isFirebaseConfigured) {
    // dev/offline fallback
    if (
      ADMIN_EMAILS.includes(email.toLowerCase()) &&
      password === DEV_ADMIN_PASSWORD
    ) {
      const fakeUser = {
        uid: 'dev-admin',
        email,
        displayName: 'Dev Admin',
        role: 'admin',
        isAnonymous: false,
        phoneNumber: null,
      };
      localStorage.setItem('sweetpos:devUser', JSON.stringify(fakeUser));
      return fakeUser;
    }
    throw new Error('Invalid admin credentials (dev mode)');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user, { role: 'admin' });
    return cred.user;
  } catch (err) {
    // Auto-create admin if email is in allow-list and account does not exist
    if (
      err.code === 'auth/user-not-found' &&
      ADMIN_EMAILS.includes(email.toLowerCase())
    ) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureUserDoc(cred.user, { role: 'admin' });
      return cred.user;
    }
    throw err;
  }
};

/* ------------------------ session ------------------------ */

export const logoutUser = async () => {
  localStorage.removeItem('sweetpos:devUser');
  if (auth) await signOut(auth);
};

export const subscribeAuth = (callback) => {
  if (!auth) {
    const dev = localStorage.getItem('sweetpos:devUser');
    callback(dev ? JSON.parse(dev) : null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);
    let profile = null;
    if (db) {
      const snap = await getDoc(doc(db, 'users', user.uid));
      profile = snap.exists() ? snap.data() : await ensureUserDoc(user);
    }
    callback({
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName || profile?.displayName,
      role: profile?.role || 'cashier',
    });
  });
};
