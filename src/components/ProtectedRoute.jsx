import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

export default function ProtectedRoute({ children, allowRoles }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-foreground/50 font-medium">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (allowRoles && profile && !allowRoles.includes(profile.role)) {
    return <Navigate to="/vac" replace />;
  }

  return <Layout>{children}</Layout>;
}
