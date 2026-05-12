import { Navigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { ROUTES } from '../../constants/routes';
import EmptyState from '../ui/EmptyState';
import { Lock } from 'lucide-react';

export default function PermissionGuard({
  perm,
  fallback = ROUTES.DASHBOARD,
  redirect = false,
  children,
}) {
  const { can } = useTenant();
  if (can(perm)) return children;
  if (redirect) return <Navigate to={fallback} replace />;
  return (
    <EmptyState
      icon={<Lock className="w-10 h-10" />}
      title="Permission required"
      description="Your role does not allow this action. Contact the shop owner."
    />
  );
}
