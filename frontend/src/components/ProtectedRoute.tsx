import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, hasAccess } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess(allowedRoles)) {
    // Yetkisiz erişim - kullanıcıyı kendi sayfasına yönlendir
    const userRole = localStorage.getItem('user') 
      ? JSON.parse(localStorage.getItem('user')!).role 
      : null;
    
    if (userRole === 'operasyon') {
      return <Navigate to="/operasyon" replace />;
    } else if (userRole === 'atolye') {
      return <Navigate to="/atolye" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;

