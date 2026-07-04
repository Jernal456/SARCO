# SARCO — Puskesmas Malata

Satu project dengan dua modul, beda route:
- `/doc` — SARCO-Doc (portal referensi asuhan keperawatan)
- `/vac` — SARCO-Vac (sistem pelaporan cakupan imunisasi posyandu)

Login memakai **username + password saja** (tanpa email sama sekali dari sisi pengguna).

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan seluruh isi file `supabase/schema.sql`.
   Ini membuat tabel `posyandu`, `users_app`, `laporan_posyandu`, `laporan_antigen`,
   `master_antigen`, mengisi 18 data posyandu awal, dan mengaktifkan Row Level Security.

3. **Deploy 2 Edge Function** (untuk fitur tambah akun & reset password dari dalam aplikasi):

   Install Supabase CLI kalau belum ada:
   ```bash
   npm install -g supabase
   ```

   Login & hubungkan ke project:
   ```bash
   supabase login
   supabase link --project-ref <project-ref-anda>
   ```
   (project-ref dilihat di URL dashboard: `https://supabase.com/dashboard/project/<project-ref>`)

   Deploy kedua function:
   ```bash
   supabase functions deploy create-user
   supabase functions deploy reset-password
   ```

   Edge Function ini otomatis punya akses ke `SUPABASE_SERVICE_ROLE_KEY` tanpa perlu
   diset manual (disediakan otomatis oleh Supabase saat deploy).

4. **Buat akun ADMIN pertama secara manual** (hanya sekali, sebagai "kunci pembuka").
   Setelah admin pertama ini ada, semua akun berikutnya (admin lain/kapus/petugas)
   bisa dibuat langsung dari halaman **Kelola Akun** di aplikasi — tidak perlu lagi
   masuk ke Supabase Dashboard.

   Cara buat admin pertama, dua opsi:

   **Opsi A — lewat Dashboard:**
   - Authentication → Users → Add User
   - Email: `admin@sarcovac.local` (format wajib: `USERNAME@sarcovac.local`)
   - Password: bebas, catat baik-baik
   - Setelah dibuat, salin **UID**-nya
   - Buka SQL Editor, jalankan:
     ```sql
     insert into users_app (id, username, role, nama_lengkap) values
       ('PASTE-UID-DISINI', 'admin', 'admin', 'Nama Anda');
     ```

   **Opsi B — panggil Edge Function langsung via curl** (tanpa requester_id karena admin pertama):
   ```bash
   curl -X POST 'https://<project-ref>.supabase.co/functions/v1/create-user' \
     -H 'Authorization: Bearer <anon-key>' \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"PasswordAnda123","role":"admin","nama_lengkap":"Nama Anda"}'
   ```

   Setelah admin pertama ini bisa login, buat akun `kapus` dan `petugas` lewat
   halaman **Kelola Akun** di aplikasi (tinggal isi username + password + role).

5. Ambil **Project URL** dan **anon public key** dari Settings → API (untuk langkah 2 di bawah).

---

## 2. Setup Project Lokal

```bash
npm install
cp .env.example .env
```

Isi `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
```

Jalankan lokal:
```bash
npm run dev
```

---

## 3. Deploy ke Vercel

1. Push folder ini ke GitHub repo (pastikan `vercel.json` ikut ter-push — ini WAJIB
   supaya refresh halaman selain `/` tidak 404).
2. Di Vercel: **New Project** → import repo.
3. Framework preset: **Vite**.
4. Environment Variables (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Kalau env var baru ditambahkan setelah deploy pertama, klik **Redeploy** manual
   (Vercel tidak auto-rebuild hanya karena env var berubah).

---

## 4. Cara Kerja Login Username-Only

- Semua akun di Supabase Auth sebenarnya tetap punya "email", tapi formatnya
  otomatis: `username@sarcovac.local` — pengguna **tidak pernah melihat atau
  mengetik email ini**.
- Saat Admin membuat akun baru lewat halaman **Kelola Akun**, mereka cukup isi
  username + password + role + nama. Edge Function `create-user` yang mengurus
  konversi ke email dummy di baliknya.
- Saat login, pengguna ketik username + password. `AuthContext.jsx` yang
  mengonversi otomatis jadi email dummy sebelum dikirim ke Supabase Auth.

---

## 5. Catatan Penting

- **Akun petugas** bisa dibuat 1 akun bersama untuk semua posyandu (sesuai
  kesepakatan awal), atau kalau nanti ingin lebih ketat, tinggal buat akun
  terpisah per posyandu lewat Kelola Akun — sistem sudah mendukung jumlah
  akun petugas berapa pun.
- **Reset password**: karena tidak ada email asli, reset dilakukan manual
  oleh Admin lewat tombol "Reset Password" di halaman Kelola Akun (memanggil
  Edge Function `reset-password`), bukan lewat email "lupa password".
- **Notifikasi "belum lapor"** dihitung otomatis (realtime) tiap dashboard
  dibuka, mulai H-7 sebelum akhir bulan.
- **Export**: Excel sudah tersedia. PDF belum — bisa ditambahkan berikutnya
  dengan `jspdf` + `jspdf-autotable` kalau dibutuhkan.

---

## 6. Struktur Folder

```
sarco-doc/
├── index.html
├── vercel.json          ← WAJIB untuk SPA routing di Vercel
├── package.json
├── vite.config.js
├── .env.example
├── supabase/
│   ├── schema.sql
│   └── functions/
│       ├── create-user/index.ts
│       └── reset-password/index.ts
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/supabase.js
│   ├── context/AuthContext.jsx
│   ├── components/ProtectedRoute.jsx
│   └── pages/
│       ├── Login.jsx
│       └── vac/
│           ├── PetugasForm.jsx
│           ├── Dashboard.jsx
│           ├── KelolaPosyandu.jsx
│           └── KelolaAkun.jsx
└── public/
    └── sarco-doc-static.html
```
