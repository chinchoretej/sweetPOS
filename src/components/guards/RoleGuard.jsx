import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';

export default function RoleGuard({ allowedRoles, fallback = ROUTES.DASHBOARD, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  const ok = Array.isArray(allowedRoles) ? allowedRoles.includes(user.role) : true;
  if (!ok) return <Navigate to={fallback} replace />;
  return children;
}
