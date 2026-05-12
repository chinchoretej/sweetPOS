import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeShop } from '../services/shopService';
import {
  subscribeSubscription,
  isSubscriptionUsable,
  daysRemaining,
} from '../services/subscriptionService';
import { fetchPlan } from '../services/planService';
import { subscribeFeatureFlags } from '../services/featureFlagService';
import { resolveFeatures, FEATURES } from '../permissions/features';
import { permissionsFor, can as canCheck, PERMS } from '../permissions/permissions';
import { ROLES, isPlatformRole } from '../permissions/roles';
import { SHOP_STATUS } from '../constants/plans';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [flagOverrides, setFlagOverrides] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track per-listener "first fire" so we don't gate the UI on a
  // listener that may legitimately resolve to null.
  const shopReady = useRef(false);
  const subReady = useRef(false);

  useEffect(() => {
    // Reset per-user.
    shopReady.current = false;
    subReady.current = false;

    if (!user) {
      setShop(null);
      setSubscription(null);
      setPlan(null);
      setFlagOverrides(null);
      setLoading(false);
      return;
    }

    if (isPlatformRole(user.role)) {
      // Super admin doesn't belong to one tenant — nothing to load.
      setShop(null);
      setSubscription(null);
      setPlan(null);
      setFlagOverrides(null);
      setLoading(false);
      return;
    }

    if (!user.shopId) {
      // Logged in but no shop yet → onboarding. Not loading.
      setShop(null);
      setSubscription(null);
      setPlan(null);
      setFlagOverrides(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const checkDone = () => {
      if (shopReady.current && subReady.current) {
        setLoading(false);
      }
    };

    const unsubs = [];

    unsubs.push(
      subscribeShop(
        user.shopId,
        (s) => {
          setShop(s);
          shopReady.current = true;
          checkDone();
        },
        (err) => {
          console.warn('[SweetPOS] shop read failed:', err.message);
          shopReady.current = true;
          checkDone();
        }
      )
    );

    unsubs.push(
      subscribeSubscription(
        user.shopId,
        (s) => {
          setSubscription(s);
          subReady.current = true;
          checkDone();
        },
        (err) => {
          console.warn('[SweetPOS] subscription read failed:', err.message);
          subReady.current = true;
          checkDone();
        }
      )
    );

    unsubs.push(
      subscribeFeatureFlags(user.shopId, setFlagOverrides, (err) =>
        console.warn('[SweetPOS] feature_flags read failed:', err.message)
      )
    );

    return () => unsubs.forEach((u) => u && u());
  }, [user]);

  // Plan: re-fetch whenever subscription.planId changes.
  // Crucially this does NOT touch `loading` — features fall back to
  // DEFAULT_FEATURES until the plan resolves.
  useEffect(() => {
    if (!subscription?.planId) {
      setPlan(null);
      return;
    }
    let active = true;
    fetchPlan(subscription.planId).then((p) => {
      if (active) setPlan(p);
    });
    return () => {
      active = false;
    };
  }, [subscription?.planId]);

  const features = useMemo(
    () => resolveFeatures(plan?.features, flagOverrides?.features),
    [plan, flagOverrides]
  );

  const permissions = useMemo(
    () => permissionsFor(user?.role, user?.permissions || []),
    [user?.role, user?.permissions]
  );

  const subscriptionUsable = useMemo(() => {
    if (!user) return false;
    if (isPlatformRole(user.role)) return true;
    if (!subscription) return false;
    return isSubscriptionUsable(subscription);
  }, [user, subscription]);

  const shopActive = useMemo(() => {
    if (!user) return false;
    if (isPlatformRole(user.role)) return true;
    if (!shop) return false;
    return shop.status !== SHOP_STATUS.SUSPENDED && shop.status !== SHOP_STATUS.ARCHIVED;
  }, [user, shop]);

  const value = useMemo(
    () => ({
      shopId: user?.shopId || null,
      shop,
      subscription,
      plan,
      features,
      permissions,
      flagOverrides,
      loading,
      subscriptionUsable,
      shopActive,
      daysRemaining: daysRemaining(subscription),
      hasFeature: (key) => !!features[key],
      can: (perm) => canCheck(permissions, perm),
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isShopOwner: user?.role === ROLES.SHOP_OWNER,
      needsOnboarding:
        !!user &&
        !isPlatformRole(user.role) &&
        !user.shopId,
    }),
    [
      user,
      shop,
      subscription,
      plan,
      features,
      permissions,
      flagOverrides,
      loading,
      subscriptionUsable,
      shopActive,
    ]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
};

export { FEATURES, PERMS };
