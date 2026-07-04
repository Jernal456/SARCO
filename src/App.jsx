import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import PetugasForm from './pages/vac/PetugasForm';
import Dashboard from './pages/vac/Dashboard';
import KelolaPosyandu from './pages/vac/KelolaPosyandu';
import KelolaAkun from './pages/vac/KelolaAkun';

// Halaman SARCO-Doc (referensi askep) untuk sementara di-embed dari file statis
// yang sudah dibuat sebelumnya. Bisa diporting penuh ke React di iterasi berikutnya.
function DocPage() {
  return (
    <iframe
      title="SARCO-Doc"
      src="/sarco-doc-static.html"
      style={{ border: 'none', width: '100%', height: '100vh' }}
    />
  );
}

// Router internal berdasarkan role setelah login ke /vac
function VacHome() {
  const { profile, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Memuat...</div>;
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
