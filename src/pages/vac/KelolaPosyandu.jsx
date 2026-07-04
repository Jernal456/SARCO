import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-foreground">Kelola Data Posyandu</h1>
        <Link to="/vac" className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors">
          ← Kembali
        </Link>
      </div>

      {/* Add Form */}
      <form onSubmit={tambah} className="bg-surface rounded-xl border border-border p-5 shadow-sm mb-5">
        <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wide mb-3">Tambah Posyandu</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Nama Posyandu"
            value={nama}
            onChange={e => setNama(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Nama Desa"
            value={desa}
            onChange={e => setDesa(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary-dark transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Daftar Posyandu</h3>
          <p className="text-xs text-foreground/40 mt-0.5">{list.length} posyandu terdaftar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Posyandu</th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Desa</th>
                <th className="text-center px-5 py-3 font-semibold text-foreground/70">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{p.nama_posyandu}</td>
                  <td className="px-5 py-3 text-foreground/60">{p.desa}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.aktif ? 'bg-success-light text-success' : 'bg-destructive-light text-destructive'
                    }`}>
                      {p.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => editNama(p)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAktif(p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          p.aktif
                            ? 'border-warning/30 text-warning bg-warning-light hover:bg-warning/10'
                            : 'border-success/30 text-success bg-success-light hover:bg-success/10'
                        }`}
                      >
                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-foreground/30 text-sm">Belum ada data posyandu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
