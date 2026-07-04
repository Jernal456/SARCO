import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginWithUsername, session, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Kalau session sudah ada (misalnya setelah refresh halaman ini),
  // langsung arahkan ke dashboard, jangan tampilkan form login lagi.
  if (!loading && session) {
    return <Navigate to="/vac" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await loginWithUsername(username, password);
    setSubmitting(false);
    if (error) {
      setError('Username atau password salah.');
      return;
    }
    navigate('/vac');
  }

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.brand}>🩺 SARCO-Vac</div>
        <p style={styles.sub}>Sistem Pelaporan Cakupan Imunisasi Posyandu</p>

        <label style={styles.label}>Username</label>
        <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} required />

        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.btn} type="submit" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3fbf6', fontFamily: 'Segoe UI, sans-serif' },
  card: { background: '#fff', padding: '36px 32px', borderRadius: 16, width: 340, boxShadow: '0 10px 30px rgba(15,110,110,.12)' },
  brand: { fontSize: 22, fontWeight: 800, color: '#0e2a3d', textAlign: 'center' },
  sub: { fontSize: 12.5, color: '#5b6b6b', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 600, color: '#0e2a3d', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e1efe6', borderRadius: 8, fontSize: 14, marginBottom: 16 },
  btn: { width: '100%', padding: 12, background: 'linear-gradient(90deg,#0f6e6e,#2f8f4e)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: 12.5, marginBottom: 12 },
};
