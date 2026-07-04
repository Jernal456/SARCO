import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowRoles }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Memuat...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allowRoles && profile && !allowRoles.includes(profile.role)) {
    return <Navigate to="/vac" replace />;
  }
  return children;
}
