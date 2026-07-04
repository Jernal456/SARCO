# SARCO — Puskesmas Malata

Satu project dengan dua modul, beda route:
- `/doc` — SARCO-Doc (portal referensi asuhan keperawatan)
- `/vac` — SARCO-Vac (sistem pelaporan cakupan imunisasi posyandu)

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan seluruh isi file `supabase/schema.sql`.
   Ini akan membuat tabel `posyandu`, `users_app`, `laporan_posyandu`, `laporan_antigen`, `master_antigen`,
   sekaligus mengisi 18 data posyandu awal dan mengaktifkan Row Level Security.
3. Buka **Authentication → Users → Add User**, buat akun untuk:
   - 1 akun **admin** (contoh email: `admin@sarcovac.local`, password bebas)
   - 1 akun **kapus** (contoh email: `kapus@sarcovac.local`)
   - 1 akun **petugas** bersama (contoh email: `petugas@sarcovac.local`)

   > Aplikasi memakai **username**, bukan email, saat login. Di balik layar,
   > username otomatis diubah jadi format email `username@sarcovac.local`
   > agar tetap kompatibel dengan Supabase Auth. Jadi kalau mau username-nya
   > `admin`, buat email `admin@sarcovac.local` di Supabase Auth.

4. Setelah akun dibuat, catat **User UID** masing-masing (terlihat di halaman Users),
   lalu jalankan query berikut di SQL Editor untuk mengisi tabel `users_app`
   (ganti `<uid>` dan `<nama>` sesuai):

   ```sql
   insert into users_app (id, username, role, nama_lengkap) values
     ('<uid-admin>', 'admin', 'admin', 'Nama Admin'),
     ('<uid-kapus>', 'kapus', 'kapus', 'Nama Kepala Puskesmas'),
     ('<uid-petugas>', 'petugas', 'petugas', 'Akun Bersama Petugas Posyandu');
   ```

5. Ambil **Project URL** dan **anon public key** dari Settings → API.

---

## 2. Setup Project Lokal

```bash
npm install
cp .env.example .env
```

Isi `.env` dengan URL & anon key dari Supabase:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
```

Jalankan lokal:
```bash
npm run dev
```

Buka `http://localhost:5173` → otomatis diarahkan ke `/vac` (login dulu).

---

## 3. Halaman SARCO-Doc (`/doc`)

Untuk saat ini, `/doc` menampilkan file statis `sarco-doc-static.html` yang sudah
dibuat sebelumnya (portal referensi askep). Salin file HTML tersebut ke folder
`public/sarco-doc-static.html` sebelum deploy, atau porting penuh ke komponen
React kalau ingin dijadikan satu kesatuan dengan Vite build.

---

## 4. Deploy ke Vercel

1. Push folder ini ke GitHub repo.
2. Di Vercel: **New Project** → import repo tersebut.
3. Framework preset: **Vite**.
4. Tambahkan Environment Variables di Vercel (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

---

## 5. Catatan Penting

- **Akun petugas bersifat 1 akun bersama** untuk semua 18 posyandu (sesuai
  kesepakatan). Karena itu, pembatasan "hanya boleh edit data posyandu sendiri"
  **tidak dijamin di level database (RLS)**, melainkan hanya di level tampilan:
  petugas memilih posyandu dulu di form, lalu riwayat & edit yang muncul
  hanya untuk posyandu yang sedang dipilih. Ini cukup untuk mencegah salah
  klik tidak sengaja, tapi secara teknis akun ini punya akses ke semua data.
  Kalau suatu saat mau lebih ketat, solusinya adalah membuat akun terpisah
  per posyandu (16 akun) — tinggal bilang kalau mau diubah ke arah itu.

- **Kelola Akun** (`/vac/kelola-akun`) saat ini hanya bisa **mengedit nama**
  user yang sudah ada. Membuat akun baru dari dalam aplikasi memerlukan
  Supabase Edge Function terpisah (karena butuh service role key yang tidak
  boleh ditaruh di frontend). Untuk sekarang, akun baru dibuat manual lewat
  Supabase Dashboard, lalu didaftarkan ke tabel `users_app` seperti langkah
  di atas.

- **Notifikasi "belum lapor"** dihitung otomatis (realtime) setiap dashboard
  dibuka, mulai H-7 sebelum akhir bulan berjalan — tanpa perlu tabel/cron
  tambahan.

- **Export Excel** sudah tersedia (rekap per posyandu & per antigen).
  Export PDF belum diimplementasi di versi ini — bisa ditambahkan dengan
  library seperti `jspdf` + `jspdf-autotable` pada iterasi berikutnya.

---

## 6. Struktur Folder

```
sarco-doc/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── supabase/
│   └── schema.sql
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   └── pages/
│       ├── Login.jsx
│       ├── doc/            (tempat porting SARCO-Doc ke React nanti)
│       └── vac/
│           ├── PetugasForm.jsx
│           ├── Dashboard.jsx
│           ├── KelolaPosyandu.jsx
│           └── KelolaAkun.jsx
```
