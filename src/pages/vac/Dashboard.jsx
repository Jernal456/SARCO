import { useEffect, useState } from 'react';
import { supabase, ANTIGEN_LIST } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

function monthRange(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map(Number);
  const start = `${yyyyMm}-01`;
  const end = new Date(y, m, 0).toISOString().slice(0, 10);
  return { start, end };
}

function currentYYYYMM() {
  return new Date().toISOString().slice(0, 7);
}

function prevYYYYMM(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}

function StatCard({ label, value, compare, icon }) {
  const diff = compare !== undefined ? value - compare : null;
  return (
    <div className="bg-surface rounded-xl border border-border p-4 text-center shadow-sm">
      <div className="w-9 h-9 rounded-lg bg-primary/10 mx-auto mb-2 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d={icon} />
        </svg>
      </div>
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-[11px] text-foreground/50 mt-0.5">{label}</div>
      {diff !== null && (
        <div className={`text-[11px] font-semibold mt-1.5 ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
          {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} vs bulan lalu
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [bulan, setBulan] = useState(currentYYYYMM());
  const [posyanduList, setPosyanduList] = useState([]);
  const [laporanBulan, setLaporanBulan] = useState([]);
  const [laporanBulanLalu, setLaporanBulanLalu] = useState([]);
  const [antigenBulan, setAntigenBulan] = useState([]);
  const [belumLapor, setBelumLapor] = useState([]);

  useEffect(() => { init(); }, [bulan]);

  async function init() {
    const { data: pList } = await supabase.from('posyandu').select('*').eq('aktif', true).order('desa');
    setPosyanduList(pList || []);

    const { start, end } = monthRange(bulan);
    const { data: lap } = await supabase
      .from('laporan_posyandu').select('*')
      .gte('tanggal_kegiatan', start).lte('tanggal_kegiatan', end);
    setLaporanBulan(lap || []);

    const prevRange = monthRange(prevYYYYMM(bulan));
    const { data: lapLalu } = await supabase
      .from('laporan_posyandu').select('*')
      .gte('tanggal_kegiatan', prevRange.start).lte('tanggal_kegiatan', prevRange.end);
    setLaporanBulanLalu(lapLalu || []);

    if (lap && lap.length) {
      const ids = lap.map(l => l.id);
      const { data: ant } = await supabase.from('laporan_antigen').select('*').in('laporan_id', ids);
      setAntigenBulan(ant || []);
    } else {
      setAntigenBulan([]);
    }

    if (bulan === currentYYYYMM()) {
      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const isWithinAlertWindow = today.getDate() >= lastDay - 7;
      if (isWithinAlertWindow && pList) {
        const sudahLaporIds = new Set((lap || []).map(l => l.posyandu_id));
        setBelumLapor(pList.filter(p => !sudahLaporIds.has(p.id)));
      } else {
        setBelumLapor([]);
      }
    } else {
      setBelumLapor([]);
    }
  }

  function totalSasaran(list) {
    return list.reduce((acc, l) => ({
      hadir: acc.hadir + l.sasaran_hadir_l + l.sasaran_hadir_p,
      tidakHadir: acc.tidakHadir + l.sasaran_tidak_hadir_l + l.sasaran_tidak_hadir_p,
    }), { hadir: 0, tidakHadir: 0 });
  }

  const totalBulanIni = totalSasaran(laporanBulan);
  const totalBulanLalu = totalSasaran(laporanBulanLalu);
  const totalDivaksin = antigenBulan.reduce((sum, a) => sum + a.jumlah_l + a.jumlah_p, 0);

  function rekapPerPosyandu() {
    return posyanduList.map(p => {
      const laps = laporanBulan.filter(l => l.posyandu_id === p.id);
      const t = totalSasaran(laps);
      const antIds = laps.map(l => l.id);
      const totalVaksin = antigenBulan.filter(a => antIds.includes(a.laporan_id)).reduce((s, a) => s + a.jumlah_l + a.jumlah_p, 0);
      return {
        nama: p.nama_posyandu,
        desa: p.desa,
        hadir: t.hadir,
        tidakHadir: t.tidakHadir,
        totalVaksin,
        sudahLapor: laps.length > 0,
      };
    });
  }

  function exportExcel() {
    const rows = rekapPerPosyandu().map(r => ({
      Posyandu: r.nama,
      Desa: r.desa,
      'Sasaran Hadir': r.hadir,
      'Sasaran Tidak Hadir': r.tidakHadir,
      'Total Divaksin': r.totalVaksin,
      Status: r.sudahLapor ? 'Sudah Lapor' : 'Belum Lapor',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${bulan}`);
    XLSX.writeFile(wb, `SARCO-Vac-Rekap-${bulan}.xlsx`);
  }

  function exportAntigenExcel() {
    const rows = ANTIGEN_LIST.map(a => {
      const items = antigenBulan.filter(x => x.jenis_antigen === a);
      return {
        Antigen: a,
        'Laki-laki': items.reduce((s, i) => s + i.jumlah_l, 0),
        Perempuan: items.reduce((s, i) => s + i.jumlah_p, 0),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Antigen ${bulan}`);
    XLSX.writeFile(wb, `SARCO-Vac-Antigen-${bulan}.xlsx`);
  }

  const rekap = rekapPerPosyandu();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">
          Dashboard {isAdmin ? 'Admin' : 'Kepala Puskesmas'}
        </h1>
      </div>

      {/* Alert */}
      {belumLapor.length > 0 && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-warning-light border border-warning/20 text-warning flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="text-sm font-medium">
            <strong>{belumLapor.length} Posyandu belum lapor bulan ini:</strong>{' '}
            {belumLapor.map(p => p.nama_posyandu).join(', ')}
          </div>
        </div>
      )}

      {/* Filter + Export */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-semibold text-foreground/70 mb-1">Pilih Bulan</label>
          <input
            type="month"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={exportExcel}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dark transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Rekap Posyandu
        </button>
        <button
          onClick={exportAntigenExcel}
          className="px-4 py-2 rounded-lg bg-accent text-on-primary text-sm font-semibold hover:bg-accent/90 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Rekap Antigen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Sasaran Hadir" value={totalBulanIni.hadir} compare={totalBulanLalu.hadir} icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <StatCard label="Total Tidak Hadir" value={totalBulanIni.tidakHadir} compare={totalBulanLalu.tidakHadir} icon="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <StatCard label="Total Divaksin" value={totalDivaksin} icon="M22 12h-4l-3 9L9 3l-3 9H2" />
        <StatCard label="Belum Lapor" value={rekap.filter(r => !r.sudahLapor).length} icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </div>

      {/* Rekap Posyandu Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm mb-5 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Rekap per Posyandu</h3>
          <p className="text-xs text-foreground/40 mt-0.5">{bulan}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Posyandu</th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Desa</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Hadir</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Tidak Hadir</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Divaksin</th>
                <th className="text-center px-5 py-3 font-semibold text-foreground/70">Status</th>
              </tr>
            </thead>
            <tbody>
              {rekap.map(r => (
                <tr key={r.nama} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{r.nama}</td>
                  <td className="px-5 py-3 text-foreground/60">{r.desa}</td>
                  <td className="px-5 py-3 text-right text-foreground">{r.hadir}</td>
                  <td className="px-5 py-3 text-right text-foreground">{r.tidakHadir}</td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">{r.totalVaksin}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.sudahLapor
                        ? 'bg-success-light text-success'
                        : 'bg-warning-light text-warning'
                    }`}>
                      {r.sudahLapor ? 'Sudah' : 'Belum'}
                    </span>
                  </td>
                </tr>
              ))}
              {rekap.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-foreground/30 text-sm">Tidak ada data posyandu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rekap Antigen Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Rekap per Antigen</h3>
          <p className="text-xs text-foreground/40 mt-0.5">{bulan}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-foreground/70">Antigen</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Laki-laki</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Perempuan</th>
                <th className="text-right px-5 py-3 font-semibold text-foreground/70">Total</th>
              </tr>
            </thead>
            <tbody>
              {ANTIGEN_LIST.map(a => {
                const items = antigenBulan.filter(x => x.jenis_antigen === a);
                const l = items.reduce((s, i) => s + i.jumlah_l, 0);
                const p = items.reduce((s, i) => s + i.jumlah_p, 0);
                return (
                  <tr key={a} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{a}</td>
                    <td className="px-5 py-3 text-right text-foreground/60">{l}</td>
                    <td className="px-5 py-3 text-right text-foreground/60">{p}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">{l + p}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
