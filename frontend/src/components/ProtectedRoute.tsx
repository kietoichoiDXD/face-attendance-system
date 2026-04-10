import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../auth';

export function ProtectedRoute({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { role } = useAuth();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to={role === 'admin' ? '/' : '/student'} replace />;
  }

  return <>{children}</>;
}
