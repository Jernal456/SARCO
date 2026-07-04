import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function KelolaPosyandu() {
  const [list, setList] = useState([]);
  const [nama, setNama] = useState('');
  const [desa, setDesa] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('posyandu').select('*').order('desa').order('nama_posyandu');
    setList(data || []);
  }

  async function tambah(e) {
    e.preventDefault();
    if (!nama || !desa) return;
    await supabase.from('posyandu').insert({ nama_posyandu: nama, desa });
    setNama(''); setDesa('');
    load();
  }

  async function toggleAktif(p) {
    await supabase.from('posyandu').update({ aktif: !p.aktif }).eq('id', p.id);
    load();
  }

  async function editNama(p) {
    const baru = prompt('Nama posyandu baru:', p.nama_posyandu);
    if (baru && baru.trim()) {
      await supabase.from('posyandu').update({ nama_posyandu: baru.trim() }).eq('id', p.id);
      load();
    }
  }

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>Kelola Data Posyandu</h2>

      <form style={s.card} onSubmit={tambah}>
        <div style={s.row}>
          <input style={s.input} placeholder="Nama Posyandu" value={nama} onChange={e => setNama(e.target.value)} />
          <input style={s.input} placeholder="Nama Desa" value={desa} onChange={e => setDesa(e.target.value)} />
          <button style={s.btn} type="submit">+ Tambah</button>
        </div>
      </form>

      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Posyandu</th><th style={s.th}>Desa</th><th style={s.th}>Status</th><th style={s.th}>Aksi</th></tr></thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td style={s.td}>{p.nama_posyandu}</td>
                <td style={s.td}>{p.desa}</td>
                <td style={s.td}>{p.aktif ? '✅ Aktif' : '⛔ Nonaktif'}</td>
                <td style={s.td}>
                  <button style={s.smallBtn} onClick={() => editNama(p)}>Edit</button>
                  <button style={s.smallBtn} onClick={() => toggleAktif(p)}>{p.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
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
  wrap: { maxWidth: 800, margin: '0 auto', padding: '20px 16px' },
  title: { color: '#0e2a3d' },
  card: { background: '#fff', border: '1px solid #e1efe6', borderRadius: 14, padding: 18, marginBottom: 18 },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  input: { flex: 1, padding: '9px 10px', border: '1px solid #cfe3da', borderRadius: 8, fontSize: 13.5 },
  btn: { background: 'linear-gradient(90deg,#0f6e6e,#2f8f4e)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e1efe6' },
  td: { padding: '8px 10px', borderBottom: '1px dashed #e1efe6' },
  smallBtn: { background: '#eaf7ee', border: '1px solid #cfe3da', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer', marginRight: 6 },
};
