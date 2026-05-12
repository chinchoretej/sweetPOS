import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { ROUTES } from '../../constants/routes';
import { FullScreenSpinner } from '../ui/Spinner';
import { isPlatformRole } from '../../permissions/roles';

/**
 * Routes wrapped in TenantGate require:
 *  1. an authenticated user
 *  2. a usable subscription (unless super-admin)
 *  3. a non-suspended shop (unless super-admin)
 *  4. a shop assigned (otherwise redirect to onboarding)
 */
export default function TenantGate({ children }) {
  const { user, loading: authLoading } = useAuth();
  const {
    loading: tenantLoading,
    needsOnboarding,
    subscriptionUsable,
    shopActive,
  } = useTenant();
  const location = useLocation();

  if (authLoading) return <FullScreenSpinner />;
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;

  if (isPlatformRole(user.role)) {
    // Super admin should be in /admin/* — bounce them there from a tenant page.
    return <Navigate to={ROUTES.ADMIN_HOME} replace />;
  }

  if (needsOnboarding) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  if (tenantLoading) return <FullScreenSpinner />;

  if (!shopActive || !subscriptionUsable) {
    return <Navigate to={ROUTES.SUBSCRIPTION_GATE} replace />;
  }

  return children;
}
