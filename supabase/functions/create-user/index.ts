// Supabase Edge Function: create-user
// Membuat akun baru HANYA dengan username + password (tanpa admin perlu isi email).
// Di baliknya, email dummy dibuat otomatis: {username}@sarcovac.local

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password, role, nama_lengkap, requester_id } = await req.json();

    if (!username || !password || !role) {
      return new Response(JSON.stringify({ error: 'username, password, dan role wajib diisi.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['admin', 'kapus', 'petugas'].includes(role)) {
      return new Response(JSON.stringify({ error: 'role tidak valid.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Pastikan yang minta bikin akun baru memang admin (proteksi tambahan)
    if (requester_id) {
      const { data: requester } = await admin.from('users_app').select('role').eq('id', requester_id).single();
      if (!requester || requester.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Hanya admin yang boleh membuat akun baru.' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const dummyEmail = `${username.trim().toLowerCase()}@sarcovac.local`;

    // 1. Buat user di Supabase Auth
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: dummyEmail,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Daftarkan profil di tabel users_app
    const { error: profileError } = await admin.from('users_app').insert({
      id: created.user.id,
      username: username.trim().toLowerCase(),
      role,
      nama_lengkap: nama_lengkap || username,
    });

    if (profileError) {
      // rollback: hapus user auth kalau gagal insert profil
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: created.user.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
