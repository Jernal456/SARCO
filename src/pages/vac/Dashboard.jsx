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

export default function Dashboard() {
  const { profile, logout } = useAuth();
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

    // Cek notifikasi: H-7 sebelum akhir bulan & posyandu yang belum lapor bulan berjalan
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
    <div style={s.wrap}>
      <div style={s.header}>
        <div>🩺 <b>SARCO-Vac</b> — Dashboard {isAdmin ? 'Admin' : 'Kepala Puskesmas'}</div>
        <button style={s.logoutBtn} onClick={logout}>Keluar</button>
      </div>

      {belumLapor.length > 0 && (
        <div style={s.alert}>
          ⚠️ <b>{belumLapor.length} Posyandu belum lapor bulan ini:</b>{' '}
          {belumLapor.map(p => p.nama_posyandu).join(', ')}
        </div>
      )}

      <div style={s.filterRow}>
        <label style={s.label}>Pilih Bulan</label>
        <input style={s.input} type="month" value={bulan} onChange={e => setBulan(e.target.value)} />
        <button style={s.exportBtn} onClick={exportExcel}>⬇ Unduh Rekap Posyandu (Excel)</button>
        <button style={s.exportBtn} onClick={exportAntigenExcel}>⬇ Unduh Rekap Antigen (Excel)</button>
      </div>

      <div style={s.statRow}>
        <Stat label="Total Sasaran Hadir" value={totalBulanIni.hadir} compare={totalBulanLalu.hadir} />
        <Stat label="Total Tidak Hadir" value={totalBulanIni.tidakHadir} compare={totalBulanLalu.tidakHadir} />
        <Stat label="Total Divaksin (semua antigen)" value={totalDivaksin} />
        <Stat label="Posyandu Belum Lapor" value={rekap.filter(r => !r.sudahLapor).length} />
      </div>

      <div style={s.card}>
        <div style={s.subhead}>Rekap per Posyandu — {bulan}</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Posyandu</th>
              <th style={s.th}>Desa</th>
              <th style={s.th}>Hadir</th>
              <th style={s.th}>Tidak Hadir</th>
              <th style={s.th}>Total Divaksin</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rekap.map(r => (
              <tr key={r.nama}>
                <td style={s.td}>{r.nama}</td>
                <td style={s.td}>{r.desa}</td>
                <td style={s.td}>{r.hadir}</td>
                <td style={s.td}>{r.tidakHadir}</td>
                <td style={s.td}>{r.totalVaksin}</td>
                <td style={s.td}>{r.sudahLapor ? '✅ Sudah' : '⚠️ Belum'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.card}>
        <div style={s.subhead}>Rekap per Antigen — {bulan}</div>
        <table style={s.table}>
          <thead>
            <tr><th style={s.th}>Antigen</th><th style={s.th}>Laki-laki</th><th style={s.th}>Perempuan</th><th style={s.th}>Total</th></tr>
          </thead>
          <tbody>
            {ANTIGEN_LIST.map(a => {
              const items = antigenBulan.filter(x => x.jenis_antigen === a);
              const l = items.reduce((s, i) => s + i.jumlah_l, 0);
              const p = items.reduce((s, i) => s + i.jumlah_p, 0);
              return (
                <tr key={a}>
                  <td style={s.td}>{a}</td><td style={s.td}>{l}</td><td style={s.td}>{p}</td><td style={s.td}>{l + p}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, compare }) {
  const diff = compare !== undefined ? value - compare : null;
  return (
    <div style={s.statBox}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {diff !== null && (
        <div style={{ fontSize: 11, color: diff >= 0 ? '#2f8f4e' : '#c0392b', marginTop: 4 }}>
          {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} vs bulan lalu
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: '20px 16px 60px', fontFamily: 'Segoe UI, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', marginBottom: 16 },
  logoutBtn: { background: '#eafff1', border: '1px solid #cfe3da', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12.5 },
  alert: { background: '#fff8e6', border: '1px solid #f0dca0', color: '#7a5c14', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13.5 },
  filterRow: { display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' },
  label: { fontSize: 12, fontWeight: 700, color: '#0b5252', display: 'block', marginBottom: 4 },
  input: { padding: '8px 10px', border: '1px solid #cfe3da', borderRadius: 8, fontSize: 13 },
  exportBtn: { background: 'linear-gradient(90deg,#0f6e6e,#2f8f4e)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 },
  statBox: { background: '#fff', border: '1px solid #e1efe6', borderRadius: 14, padding: 16, textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: 800, color: '#0b5252' },
  statLabel: { fontSize: 11.5, color: '#5b6b6b', marginTop: 2 },
  card: { background: '#fff', border: '1px solid #e1efe6', borderRadius: 16, padding: 20, marginBottom: 20, overflowX: 'auto' },
  subhead: { fontSize: 13, fontWeight: 800, color: '#0b5252', marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e1efe6', color: '#0e2a3d' },
  td: { padding: '8px 10px', borderBottom: '1px dashed #e1efe6' },
};
