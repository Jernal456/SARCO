import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function KelolaAkun() {
  const { profile } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'petugas', nama_lengkap: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('users_app').select('*').order('role');
    setList(data || []);
  }

  async function ubahNama(u) {
    const baru = prompt('Nama lengkap baru:', u.nama_lengkap || '');
    if (baru !== null) {
      await supabase.from('users_app').update({ nama_lengkap: baru }).eq('id', u.id);
      load();
    }
  }

  async function handleTambah(e) {
    e.preventDefault();
    setMsg('');
    if (!form.username || !form.password) {
      setMsg('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('create_account_no_email', {
      p_username: form.username,
      p_password: form.password,
      p_role: form.role,
      p_nama_lengkap: form.nama_lengkap,
      p_requester_id: profile?.id,
    });
    setLoading(false);

    if (error || data?.error) {
      setMsg('Gagal: ' + (data?.error || error.message));
      return;
    }
    setMsg('Akun berhasil dibuat.');
    setForm({ username: '', password: '', role: 'petugas', nama_lengkap: '' });
    load();
  }

  async function handleResetPassword(u) {
    const newPass = prompt(`Password baru untuk "${u.username}":`);
    if (!newPass) return;
    const { data, error } = await supabase.functions.invoke('reset-password', {
      body: { target_user_id: u.id, new_password: newPass, requester_id: profile?.id },
    });
    if (error || data?.error) {
      alert('Gagal reset password: ' + (data?.error || error.message));
      return;
    }
    alert('Password berhasil direset.');
  }

  const roleLabel = (r) => {
    if (r === 'admin') return 'Admin';
    if (r === 'kapus') return 'Kepala Puskesmas';
    return 'Petugas';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-foreground">Kelola Akun</h1>
        <Link to="/vac" className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors">
          ← Kembali
        </Link>
      </div>

      {/* Add Form */}
      <form onSubmit={handleTambah} className="bg-surface rounded-xl border border-border p-5 shadow-sm mb-5">
        <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-3">Tambah Akun Baru</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          <select
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="petugas">Petugas</option>
            <option value="admin">Admin</option>
            <option value="kapus">Kepala Puskesmas</option>
          </select>
          <input
            type="text"
            placeholder="Nama Lengkap"
            value={form.nama_lengkap}
            onChange={e => setForm({ ...form, nama_lengkap: e.target.value })}
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Buat Akun
            </>
          )}
        </button>

        {msg && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
            msg.includes('Gagal')
              ? 'bg-destructive/5 border border-destructive/20 text-destructive'
              : 'bg-success-light border border-success/20 text-success'
          }`}>
            {msg}
          </div>
        )}
      </form>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Daftar Akun</h3>
          <p className="text-xs text-foreground/40 mt-0.5">{list.length} akun terdaftar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Username</th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Nama Lengkap</th>
                <th className="text-center px-5 py-3 font-semibold text-foreground/70">Role</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{u.username}</td>
                  <td className="px-5 py-3 text-foreground/60">{u.nama_lengkap || '-'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-primary/10 text-primary'
                      : u.role === 'kapus' ? 'bg-accent/10 text-accent'
                      : 'bg-muted text-foreground/60'
                    }`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => ubahNama(u)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Edit Nama
                      </button>
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="px-3 py-1.5 rounded-lg border border-warning/30 text-warning bg-warning-light text-xs font-medium hover:bg-warning/10 transition-colors cursor-pointer"
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-foreground/30 text-sm">Belum ada akun</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
