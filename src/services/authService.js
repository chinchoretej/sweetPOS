import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { ROLES, normalizeLegacyRole } from '../permissions/roles';
import { bindUserToShopByMobile } from './employeeService';

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Legacy v1 admins (used to bootstrap shop owners on existing accounts)
const LEGACY_ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const DEV_ADMIN_PASSWORD = import.meta.env.VITE_DEV_ADMIN_PASSWORD || 'admin123';

/* ------------------------- helpers ------------------------- */

const ensureUserDoc = async (user, extra = {}) => {
  if (!db || !user) return null;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const emailLower = (user.email || extra.email || '').toLowerCase();
  const isSuperAdmin = emailLower && SUPER_ADMIN_EMAILS.includes(emailLower);

  if (!snap.exists()) {
    // First-ever login. New users default to "unassigned" — they will see
    // the onboarding wizard to create their shop, becoming SHOP_OWNER.
    // Super admins from the env allow-list get SUPER_ADMIN immediately.
    let role = ROLES.CASHIER;
    if (isSuperAdmin) role = ROLES.SUPER_ADMIN;
    else if (emailLower && LEGACY_ADMIN_EMAILS.includes(emailLower)) {
      // Backwards-compat: env-listed v1 admins → SHOP_OWNER (will onboard)
      role = ROLES.SHOP_OWNER;
    } else if (extra.role) {
      role = extra.role;
    }

    await setDoc(ref, {
      uid: user.uid,
      phone: user.phoneNumber || null,
      email: user.email || null,
      displayName: user.displayName || extra.displayName || null,
      role,
      shopId: extra.shopId || null,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Existing user — reconcile super-admin status if env was changed.
    const data = snap.data();
    const patch = {};
    if (isSuperAdmin && data.role !== ROLES.SUPER_ADMIN) {
      patch.role = ROLES.SUPER_ADMIN;
    }
    // Migrate legacy 'admin' role → SHOP_OWNER
    if (data.role === 'admin') {
      patch.role = isSuperAdmin ? ROLES.SUPER_ADMIN : ROLES.SHOP_OWNER;
    }
    if (Object.keys(patch).length) {
      patch.updatedAt = serverTimestamp();
      await setDoc(ref, patch, { merge: true });
    }
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
  const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  window.__sweetposRecaptcha = verifier;
  return verifier;
};

export const sendOtp = async (mobileNumber, recaptchaVerifier) => {
  if (!auth) throw new Error('Firebase not configured');
  const phone = mobileNumber.startsWith('+')
    ? mobileNumber
    : `+91${mobileNumber.replace(/\D/g, '')}`;
  return signInWithPhoneNumber(auth, phone, recaptchaVerifier);
};

export const verifyOtp = async (confirmation, otp) => {
  const result = await confirmation.confirm(otp);
  await ensureUserDoc(result.user);
  return result.user;
};

/* ----------------------- admin login ----------------------- */

export const adminLogin = async (email, password) => {
  const emailLower = email.toLowerCase();

  if (!isFirebaseConfigured) {
    if (
      (LEGACY_ADMIN_EMAILS.includes(emailLower) ||
        SUPER_ADMIN_EMAILS.includes(emailLower)) &&
      password === DEV_ADMIN_PASSWORD
    ) {
      const fakeUser = {
        uid: 'dev-admin',
        email,
        displayName: 'Dev Admin',
        role: SUPER_ADMIN_EMAILS.includes(emailLower)
          ? ROLES.SUPER_ADMIN
          : ROLES.SHOP_OWNER,
        shopId: null,
        phoneNumber: null,
      };
      localStorage.setItem('sweetpos:devUser', JSON.stringify(fakeUser));
      return fakeUser;
    }
    throw new Error('Invalid admin credentials (dev mode)');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user);
    return cred.user;
  } catch (err) {
    const looksMissing =
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials';

    const isAllowed =
      LEGACY_ADMIN_EMAILS.includes(emailLower) ||
      SUPER_ADMIN_EMAILS.includes(emailLower);

    if (looksMissing && isAllowed) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserDoc(cred.user);
        return cred.user;
      } catch (createErr) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error(
            'Account exists but password is incorrect. Reset it from the Firebase console or use a different password.'
          );
        }
        if (createErr.code === 'auth/weak-password') {
          throw new Error('Password too weak — use at least 6 characters.');
        }
        throw createErr;
      }
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

  // Cleanup handle for the current Firestore profile listener; it gets
  // swapped whenever the auth user changes.
  let unsubProfile = null;
  const buildPayload = (firebaseUser, profile) => ({
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    phoneNumber: firebaseUser.phoneNumber,
    displayName: firebaseUser.displayName || profile?.displayName,
    role: normalizeLegacyRole(profile?.role),
    shopId: profile?.shopId || null,
    status: profile?.status || 'active',
    permissions: profile?.permissions || [],
  });

  const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    // Tear down the previous profile listener whenever auth changes.
    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }

    if (!firebaseUser) {
      callback(null);
      return;
    }

    if (!db) {
      callback(buildPayload(firebaseUser, null));
      return;
    }

    // Reconcile (creates the doc on first login, promotes super admins,
    // migrates legacy 'admin' → 'shop_owner').
    try {
      await ensureUserDoc(firebaseUser);
    } catch (err) {
      console.warn('[SweetPOS] user doc reconcile failed:', err.message);
    }

    // If they signed in via Mobile OTP and have no shop yet, see whether
    // a shop owner has invited them. If so, attach them to that shop with
    // the invited role.
    if (firebaseUser.phoneNumber) {
      try {
        await bindUserToShopByMobile(firebaseUser.uid, firebaseUser.phoneNumber);
      } catch (err) {
        console.warn('[SweetPOS] employee bind failed:', err.message);
      }
    }

    // Live-subscribe to the user doc so role / shopId changes
    // (e.g. post-onboarding, employee binding) propagate immediately
    // without waiting for the next Firebase Auth event.
    unsubProfile = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        const profile = snap.exists() ? snap.data() : null;
        callback(buildPayload(firebaseUser, profile));
      },
      (err) => {
        console.warn('[SweetPOS] user doc snapshot failed:', err.message);
        callback(buildPayload(firebaseUser, null));
      }
    );
  });

  return () => {
    if (unsubProfile) unsubProfile();
    unsubAuth();
  };
};
