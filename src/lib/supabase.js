import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
