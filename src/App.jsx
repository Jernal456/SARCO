import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import PetugasForm from './pages/vac/PetugasForm';
import Dashboard from './pages/vac/Dashboard';
import KelolaPosyandu from './pages/vac/KelolaPosyandu';
import KelolaAkun from './pages/vac/KelolaAkun';

function DocPage() {
  return (
    <iframe
      title="SARCO-Doc"
      src="/sarco-doc-static.html"
      style={{ border: 'none', width: '100%', height: '100vh' }}
    />
  );
}

function VacHome() {
  const { profile, loading } = useAuth();

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

  if (profile?.role === 'petugas') return <PetugasForm />;
  if (profile?.role === 'admin' || profile?.role === 'kapus') return <Dashboard />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/vac" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/doc" element={<DocPage />} />

          <Route path="/vac" element={
            <ProtectedRoute><VacHome /></ProtectedRoute>
          } />

          <Route path="/vac/kelola-posyandu" element={
            <ProtectedRoute allowRoles={['admin']}><KelolaPosyandu /></ProtectedRoute>
          } />

          <Route path="/vac/kelola-akun" element={
            <ProtectedRoute allowRoles={['admin']}><KelolaAkun /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/vac" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
