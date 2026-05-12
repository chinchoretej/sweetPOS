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
import { ROLES, normalizeLegacyRole } from '../permissions/roles';

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
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);

    let profile = null;
    if (db) {
      // Always reconcile so that:
      //   - newly added super-admin emails are promoted on next login
      //   - legacy v1 'admin' role is migrated to v2 'shop_owner'/'super_admin'
      //   - displayName / phone / email are kept in sync
      try {
        profile = await ensureUserDoc(user);
      } catch (err) {
        // If reconciliation fails (e.g. transient rule denial), fall back to
        // whatever we currently have so the app doesn't lock the user out.
        console.warn('[SweetPOS] user doc reconcile failed:', err.message);
        const snap = await getDoc(doc(db, 'users', user.uid));
        profile = snap.exists() ? snap.data() : null;
      }
    }

    callback({
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName || profile?.displayName,
      role: normalizeLegacyRole(profile?.role),
      shopId: profile?.shopId || null,
      status: profile?.status || 'active',
      permissions: profile?.permissions || [],
    });
  });
};
