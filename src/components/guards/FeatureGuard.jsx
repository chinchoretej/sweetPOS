import { Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { ROUTES } from '../../constants/routes';
import EmptyState from '../ui/EmptyState';
import { FEATURE_LABEL } from '../../permissions/features';

export default function FeatureGuard({
  feature,
  fallback = ROUTES.DASHBOARD,
  redirect = false,
  children,
}) {
  const { hasFeature, isShopOwner } = useTenant();
  if (hasFeature(feature)) return children;
  if (redirect) return <Navigate to={fallback} replace />;
  return (
    <EmptyState
      icon={<Sparkles className="w-10 h-10" />}
      title={`${FEATURE_LABEL[feature] || 'Feature'} not available on your plan`}
      description={
        isShopOwner
          ? 'Upgrade your subscription to unlock this feature.'
          : 'Ask the shop owner to upgrade the plan to enable this feature.'
      }
    />
  );
}
