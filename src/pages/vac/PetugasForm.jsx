import { useEffect, useState } from 'react';
import { supabase, ANTIGEN_LIST } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PetugasForm() {
  const { profile, logout } = useAuth();
  const [posyanduList, setPosyanduList] = useState([]);
  const [posyanduId, setPosyanduId] = useState('');
  const [tanggal, setTanggal] = useState(todayISO());
  const [namaPetugas, setNamaPetugas] = useState('');
  const [hadirL, setHadirL] = useState(0);
  const [hadirP, setHadirP] = useState(0);
  const [tidakHadirL, setTidakHadirL] = useState(0);
  const [tidakHadirP, setTidakHadirP] = useState(0);
  const [antigen, setAntigen] = useState(
    Object.fromEntries(ANTIGEN_LIST.map(a => [a, { l: 0, p: 0 }]))
  );
  const [riwayat, setRiwayat] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadPosyandu();
  }, []);

  useEffect(() => {
    if (posyanduId) loadRiwayat(posyanduId);
  }, [posyanduId]);

  async function loadPosyandu() {
    const { data } = await supabase.from('posyandu').select('*').eq('aktif', true).order('desa').order('nama_posyandu');
    setPosyanduList(data || []);
    if (data && data.length) setPosyanduId(data[0].id);
  }

  async function loadRiwayat(pid) {
    const { data } = await supabase
      .from('laporan_posyandu')
      .select('*')
      .eq('posyandu_id', pid)
      .order('tanggal_kegiatan', { ascending: false })
      .limit(10);
    setRiwayat(data || []);
  }

  function resetForm() {
    setTanggal(todayISO());
    setNamaPetugas('');
    setHadirL(0); setHadirP(0); setTidakHadirL(0); setTidakHadirP(0);
    setAntigen(Object.fromEntries(ANTIGEN_LIST.map(a => [a, { l: 0, p: 0 }])));
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');

    const payload = {
      posyandu_id: posyanduId,
      tanggal_kegiatan: tanggal,
      nama_petugas: namaPetugas,
      sasaran_hadir_l: Number(hadirL),
      sasaran_hadir_p: Number(hadirP),
      sasaran_tidak_hadir_l: Number(tidakHadirL),
      sasaran_tidak_hadir_p: Number(tidakHadirP),
      created_by: profile?.id,
    };

    let laporanId = editingId;

    if (editingId) {
      const { error } = await supabase.from('laporan_posyandu').update(payload).eq('id', editingId);
      if (error) { setMsg('Gagal menyimpan: ' + error.message); return; }
      await supabase.from('laporan_antigen').delete().eq('laporan_id', editingId);
    } else {
      const { data, error } = await supabase.from('laporan_posyandu').insert(payload).select().single();
      if (error) { setMsg('Gagal menyimpan: ' + error.message); return; }
      laporanId = data.id;
    }

    const rows = Object.entries(antigen)
      .filter(([, v]) => Number(v.l) > 0 || Number(v.p) > 0)
      .map(([jenis, v]) => ({
        laporan_id: laporanId,
        jenis_antigen: jenis,
        jumlah_l: Number(v.l),
        jumlah_p: Number(v.p),
      }));

    if (rows.length) {
      await supabase.from('laporan_antigen').insert(rows);
    }

    setMsg('✅ Laporan berhasil disimpan.');
    resetForm();
    loadRiwayat(posyanduId);
  }

  async function handleEdit(laporan) {
    setEditingId(laporan.id);
    setTanggal(laporan.tanggal_kegiatan);
    setNamaPetugas(laporan.nama_petugas);
    setHadirL(laporan.sasaran_hadir_l);
    setHadirP(laporan.sasaran_hadir_p);
    setTidakHadirL(laporan.sasaran_tidak_hadir_l);
    setTidakHadirP(laporan.sasaran_tidak_hadir_p);

    const { data } = await supabase.from('laporan_antigen').select('*').eq('laporan_id', laporan.id);
    const newAntigen = Object.fromEntries(ANTIGEN_LIST.map(a => [a, { l: 0, p: 0 }]));
    (data || []).forEach(r => { newAntigen[r.jenis_antigen] = { l: r.jumlah_l, p: r.jumlah_p }; });
    setAntigen(newAntigen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateAntigen(jenis, key, val) {
    setAntigen(prev => ({ ...prev, [jenis]: { ...prev[jenis], [key]: val } }));
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>🩺 <b>SARCO-Vac</b> — Input Laporan Posyandu</div>
        <button style={s.logoutBtn} onClick={logout}>Keluar</button>
      </div>

      <form style={s.card} onSubmit={handleSubmit}>
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Nama Posyandu</label>
            <select style={s.input} value={posyanduId} onChange={e => { setPosyanduId(e.target.value); resetForm(); }}>
              {posyanduList.map(p => (
                <option key={p.id} value={p.id}>{p.nama_posyandu} — {p.desa}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Tanggal Kegiatan</label>
            <input style={s.input} type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
          </div>
        </div>

        <label style={s.label}>Nama Petugas yang Melayani</label>
        <input style={s.input} placeholder="cth: Maria, Yuven" value={namaPetugas} onChange={e => setNamaPetugas(e.target.value)} required />

        <div style={s.subhead}>Jumlah Sasaran</div>
        <div style={s.row}>
          <NumField label="Hadir (L)" value={hadirL} set={setHadirL} />
          <NumField label="Hadir (P)" value={hadirP} set={setHadirP} />
          <NumField label="Tidak Hadir (L)" value={tidakHadirL} set={setTidakHadirL} />
          <NumField label="Tidak Hadir (P)" value={tidakHadirP} set={setTidakHadirP} />
        </div>

        <div style={s.subhead}>Jumlah Divaksin per Antigen</div>
        <div style={s.antigenGrid}>
          {ANTIGEN_LIST.map(a => (
            <div key={a} style={s.antigenRow}>
              <span style={s.antigenName}>{a}</span>
              <input style={s.antigenInput} type="number" min="0" placeholder="L"
                value={antigen[a].l} onChange={e => updateAntigen(a, 'l', e.target.value)} />
              <input style={s.antigenInput} type="number" min="0" placeholder="P"
                value={antigen[a].p} onChange={e => updateAntigen(a, 'p', e.target.value)} />
            </div>
          ))}
        </div>

        {msg && <div style={s.msg}>{msg}</div>}

        <button style={s.saveBtn} type="submit">
          💾 {editingId ? 'Update Laporan' : 'Simpan Laporan'}
        </button>
        {editingId && <button type="button" style={s.cancelBtn} onClick={resetForm}>Batal Edit</button>}
      </form>

      <div style={s.card}>
        <div style={s.subhead}>Riwayat Laporan — {posyanduList.find(p => p.id === posyanduId)?.nama_posyandu}</div>
        {riwayat.length === 0 && <p style={{ fontSize: 13, color: '#5b6b6b' }}>Belum ada laporan.</p>}
        {riwayat.map(r => (
          <div key={r.id} style={s.riwayatRow}>
            <div>
              <b>{r.tanggal_kegiatan}</b> — {r.nama_petugas}
              <div style={{ fontSize: 12, color: '#5b6b6b' }}>
                Hadir: {r.sasaran_hadir_l + r.sasaran_hadir_p} | Tidak Hadir: {r.sasaran_tidak_hadir_l + r.sasaran_tidak_hadir_p}
              </div>
            </div>
            <button style={s.editBtn} onClick={() => handleEdit(r)}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumField({ label, value, set }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type="number" min="0" value={value} onChange={e => set(e.target.value)} />
    </div>
  );
}

const s = {
  wrap: { maxWidth: 760, margin: '0 auto', padding: '20px 16px 60px', fontFamily: 'Segoe UI, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', marginBottom: 16 },
  logoutBtn: { background: '#eafff1', border: '1px solid #cfe3da', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12.5 },
  card: { background: '#fff', border: '1px solid #e1efe6', borderRadius: 16, padding: 22, marginBottom: 20, boxShadow: '0 4px 14px rgba(15,110,110,.06)' },
  row: { display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' },
  label: { fontSize: 12.5, fontWeight: 600, color: '#0e2a3d', display: 'block', marginBottom: 5, marginTop: 10 },
  input: { width: '100%', padding: '9px 10px', border: '1px solid #cfe3da', borderRadius: 8, fontSize: 13.5 },
  subhead: { fontSize: 12, fontWeight: 800, color: '#0b5252', textTransform: 'uppercase', letterSpacing: .5, margin: '18px 0 10px' },
  antigenGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 6 },
  antigenRow: { display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 8, alignItems: 'center' },
  antigenName: { fontSize: 13 },
  antigenInput: { padding: '6px 8px', border: '1px solid #cfe3da', borderRadius: 6, fontSize: 13, width: '100%' },
  msg: { marginTop: 14, fontSize: 13, color: '#0b5252', fontWeight: 600 },
  saveBtn: { width: '100%', marginTop: 18, padding: 12, background: 'linear-gradient(90deg,#0f6e6e,#2f8f4e)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { width: '100%', marginTop: 8, padding: 10, background: '#fff', border: '1px solid #e1efe6', borderRadius: 10, cursor: 'pointer' },
  riwayatRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #e1efe6', fontSize: 13 },
  editBtn: { background: '#eaf7ee', border: '1px solid #cfe3da', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 },
};
