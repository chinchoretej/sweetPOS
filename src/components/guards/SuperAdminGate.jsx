import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../permissions/roles';
import { FullScreenSpinner } from '../ui/Spinner';

export default function SuperAdminGate({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (user.role !== ROLES.SUPER_ADMIN) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return children;
}
