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
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { ...form, requester_id: profile?.id },
    });
    setLoading(false);

    if (error || data?.error) {
      setMsg('❌ Gagal: ' + (data?.error || error.message));
      return;
    }
    setMsg('✅ Akun berhasil dibuat.');
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

  return (
    <div style={s.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={s.title}>Kelola Akun</h2>
        <Link to="/vac" style={s.backLink}>← Kembali ke Dashboard</Link>
      </div>

      <form style={s.card} onSubmit={handleTambah}>
        <div style={s.subhead}>+ Tambah Akun Baru</div>
        <div style={s.row}>
          <input style={s.input} placeholder="Username" value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })} />
          <input style={s.input} placeholder="Password" type="text" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} />
          <select style={s.input} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="petugas">Petugas</option>
            <option value="admin">Admin</option>
            <option value="kapus">Kepala Puskesmas</option>
          </select>
          <input style={s.input} placeholder="Nama Lengkap" value={form.nama_lengkap}
            onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} />
          <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Memproses...' : '+ Buat Akun'}</button>
        </div>
        {msg && <div style={s.msg}>{msg}</div>}
      </form>

      <div style={s.card}>
        <div style={s.subhead}>Daftar Akun</div>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Username</th><th style={s.th}>Nama Lengkap</th><th style={s.th}>Role</th><th style={s.th}>Aksi</th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td style={s.td}>{u.username}</td>
                <td style={s.td}>{u.nama_lengkap || '-'}</td>
                <td style={s.td}>{u.role}</td>
                <td style={s.td}>
                  <button style={s.smallBtn} onClick={() => ubahNama(u)}>Edit Nama</button>
                  <button style={s.smallBtn} onClick={() => handleResetPassword(u)}>Reset Password</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: '20px 16px' },
  title: { color: '#0e2a3d' },
  backLink: { fontSize: 12.5, color: '#0b5252', textDecoration: 'none', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #e1efe6', borderRadius: 14, padding: 18, marginBottom: 18 },
  subhead: { fontSize: 12, fontWeight: 800, color: '#0b5252', textTransform: 'uppercase', marginBottom: 12 },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 140, padding: '9px 10px', border: '1px solid #cfe3da', borderRadius: 8, fontSize: 13.5 },
  btn: { background: 'linear-gradient(90deg,#0f6e6e,#2f8f4e)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer' },
  msg: { marginTop: 12, fontSize: 13, fontWeight: 600, color: '#0b5252' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e1efe6' },
  td: { padding: '8px 10px', borderBottom: '1px dashed #e1efe6' },
  smallBtn: { background: '#eaf7ee', border: '1px solid #cfe3da', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer', marginRight: 6 },
};
