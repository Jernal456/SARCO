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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <img src="/sarco-doc-logo.png" alt="SARCO-Vac" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">SARCO-Vac</h1>
          <p className="text-sm text-foreground/50 mt-1">Sistem Pelaporan Cakupan Imunisasi Posyandu</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                placeholder="Masukkan username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                placeholder="Masukkan password"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </span>
            ) : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
