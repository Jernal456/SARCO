import { useEffect, useState } from 'react';
import { supabase, ANTIGEN_LIST } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function NumField({ label, value, set }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground/70 mb-1">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => set(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
      />
    </div>
  );
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

  useEffect(() => { loadPosyandu(); }, []);
  useEffect(() => { if (posyanduId) loadRiwayat(posyanduId); }, [posyanduId]);

  async function loadPosyandu() {
    const { data } = await supabase.from('posyandu').select('*').eq('aktif', true).order('desa').order('nama_posyandu');
    setPosyanduList(data || []);
    if (data && data.length) setPosyanduId(data[0].id);
  }

  async function loadRiwayat(pid) {
    const { data } = await supabase
      .from('laporan_posyandu').select('*')
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

    setMsg('Laporan berhasil disimpan.');
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

  const posyanduName = posyanduList.find(p => p.id === posyanduId)?.nama_posyandu || '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Input Laporan Posyandu</h1>
          <p className="text-xs text-foreground/50 mt-0.5">{posyanduName}</p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-5 shadow-sm mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-foreground/70 mb-1">Posyandu</label>
            <select
              value={posyanduId}
              onChange={e => { setPosyanduId(e.target.value); resetForm(); }}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
            >
              {posyanduList.map(p => (
                <option key={p.id} value={p.id}>{p.nama_posyandu} — {p.desa}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/70 mb-1">Tanggal Kegiatan</label>
            <input
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-foreground/70 mb-1">Nama Petugas</label>
          <input
            type="text"
            placeholder="cth: Maria, Yuven"
            value={namaPetugas}
            onChange={e => setNamaPetugas(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>

        {/* Sasaran */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-3">Jumlah Sasaran</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumField label="Hadir (L)" value={hadirL} set={setHadirL} />
            <NumField label="Hadir (P)" value={hadirP} set={setHadirP} />
            <NumField label="Tidak Hadir (L)" value={tidakHadirL} set={setTidakHadirL} />
            <NumField label="Tidak Hadir (P)" value={tidakHadirP} set={setTidakHadirP} />
          </div>
        </div>

        {/* Antigen */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-3">Jumlah Divaksin per Antigen</h3>
          <div className="space-y-2">
            {ANTIGEN_LIST.map(a => (
              <div key={a} className="grid grid-cols-[1fr_64px_64px] gap-2 items-center">
                <span className="text-sm text-foreground truncate">{a}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="L"
                  value={antigen[a].l}
                  onChange={e => updateAntigen(a, 'l', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="P"
                  value={antigen[a].p}
                  onChange={e => updateAntigen(a, 'p', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        {msg && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium ${
            msg.includes('Gagal')
              ? 'bg-destructive/5 border border-destructive/20 text-destructive'
              : 'bg-success-light border border-success/20 text-success'
          }`}>
            {msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            {editingId ? 'Update Laporan' : 'Simpan Laporan'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Riwayat */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-3">Riwayat Laporan</h3>
        {riwayat.length === 0 && (
          <p className="text-sm text-foreground/40 py-6 text-center">Belum ada laporan.</p>
        )}
        <div className="space-y-2">
          {riwayat.map(r => (
            <div key={r.id} className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
              <div>
                <div className="text-sm font-semibold text-foreground">{r.tanggal_kegiatan}</div>
                <div className="text-xs text-foreground/50 mt-0.5">
                  {r.nama_petugas} — Hadir: {r.sasaran_hadir_l + r.sasaran_hadir_p} | Tidak Hadir: {r.sasaran_tidak_hadir_l + r.sasaran_tidak_hadir_p}
                </div>
              </div>
              <button
                onClick={() => handleEdit(r)}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
