import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Kalau ini muncul di console browser, berarti env var belum terbaca
  // (cek file .env lokal, atau Environment Variables di dashboard Vercel).
  console.error('[SARCO] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum terset!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // simpan sesi di localStorage
    autoRefreshToken: true,     // auto-refresh token sebelum expired
    detectSessionInUrl: true,
    storageKey: 'sarco-vac-auth', // key unik biar tidak bentrok dgn project supabase lain
    storage: window.localStorage,
  },
});

// Daftar antigen tetap (urutan tampil di form)
export const ANTIGEN_LIST = [
  'BCG',
  'DPT-HB-Hib 1', 'DPT-HB-Hib 2', 'DPT-HB-Hib 3', 'DPT-HB-Hib 4',
  'Polio 1', 'Polio 2', 'Polio 3', 'Polio 4',
  'IPV 1', 'IPV 2',
  'PCV 1', 'PCV 2', 'PCV 3',
  'Rota 1', 'Rota 2', 'Rota 3',
  'MR 1', 'MR 2'
];
