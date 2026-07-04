import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// CATATAN PENTING:
// Pembuatan user baru (auth.users) idealnya dilakukan lewat Supabase Admin API
// (butuh service_role key) yang TIDAK aman dijalankan di frontend.
// Untuk produksi, buat sebuah Supabase Edge Function "create-user" yang
// dipanggil dari sini, atau buat akun manual lewat Supabase Dashboard.
// Komponen ini hanya menampilkan & mengelola data profil (users_app),
// bukan membuat akun auth baru.

export default function KelolaAkun() {
  const [list, setList] = useState([]);

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

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>Kelola Akun</h2>
      <div style={s.note}>
        ℹ️ Untuk membuat akun baru (petugas/kapus/admin), gunakan Supabase Dashboard →
        Authentication → Add User, lalu tambahkan baris di tabel <code>users_app</code>
        dengan role yang sesuai. Fitur "buat akun" langsung dari sini memerlukan
        Edge Function terpisah agar aman (tidak expose service key ke browser).
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Username</th><th style={s.th}>Nama Lengkap</th><th style={s.th}>Role</th><th style={s.th}>Aksi</th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td style={s.td}>{u.username}</td>
                <td style={s.td}>{u.nama_lengkap || '-'}</td>
                <td style={s.td}>{u.role}</td>
                <td style={s.td}><button style={s.smallBtn} onClick={() => ubahNama(u)}>Edit Nama</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 800, margin: '0 auto', padding: '20px 16px' },
  title: { color: '#0e2a3d' },
  note: { background: '#fff8e6', border: '1px solid #f0dca0', color: '#7a5c14', borderRadius: 10, padding: '12px 16px', fontSize: 12.5, marginBottom: 18, lineHeight: 1.5 },
  card: { background: '#fff', border: '1px solid #e1efe6', borderRadius: 14, padding: 18 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e1efe6' },
  td: { padding: '8px 10px', borderBottom: '1px dashed #e1efe6' },
  smallBtn: { background: '#eaf7ee', border: '1px solid #cfe3da', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer' },
};
