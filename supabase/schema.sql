-- ==========================================================
-- SARCO-Vac — Supabase Schema
-- ==========================================================

create extension if not exists "uuid-ossp";

-- ---------- POSYANDU ----------
create table if not exists posyandu (
  id uuid primary key default uuid_generate_v4(),
  nama_posyandu text not null,
  desa text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed data awal (16 posyandu, 6 desa)
insert into posyandu (nama_posyandu, desa) values
  ('Limbu Uma', 'Loko Ry'),
  ('Loko Ry', 'Loko Ry'),
  ('Gollu Ede', 'Loko Ry'),
  ('Gollu Sapi', 'Loko Ry'),
  ('Daduka', 'Loko Ry'),
  ('Ana Ndelo', 'Loko Ry'),
  ('Mawar Malata', 'Malata'),
  ('Pagolu Ndima', 'Malata'),
  ('Dangga Ngara', 'Ngadu Pada'),
  ('Gollu Kalogho', 'Ngadu Pada'),
  ('Iru Ole', 'Elu Loda'),
  ('Puu Delo', 'Elu Loda'),
  ('Patonda Rindi', 'Manu Mada'),
  ('Omba Nalo', 'Manu Mada'),
  ('Wee Laghua', 'Lingu Lango'),
  ('Lingu Lango', 'Lingu Lango'),
  ('Delapa', 'Lingu Lango'),
  ('Molina', 'Lingu Lango')
on conflict do nothing;

-- ---------- PROFIL USER (terhubung ke auth.users) ----------
create table if not exists users_app (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null check (role in ('admin','kapus','petugas')),
  nama_lengkap text,
  created_at timestamptz not null default now()
);

-- ---------- LAPORAN KEGIATAN POSYANDU ----------
create table if not exists laporan_posyandu (
  id uuid primary key default uuid_generate_v4(),
  posyandu_id uuid not null references posyandu(id) on delete cascade,
  tanggal_kegiatan date not null default current_date,
  nama_petugas text not null,
  sasaran_hadir_l int not null default 0,
  sasaran_hadir_p int not null default 0,
  sasaran_tidak_hadir_l int not null default 0,
  sasaran_tidak_hadir_p int not null default 0,
  created_by uuid references users_app(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- RINCIAN ANTIGEN PER LAPORAN ----------
create table if not exists laporan_antigen (
  id uuid primary key default uuid_generate_v4(),
  laporan_id uuid not null references laporan_posyandu(id) on delete cascade,
  jenis_antigen text not null,
  jumlah_l int not null default 0,
  jumlah_p int not null default 0
);

-- Daftar antigen tetap (dipakai di frontend, disimpan di sini untuk referensi)
create table if not exists master_antigen (
  urutan int primary key,
  nama text not null
);
insert into master_antigen (urutan, nama) values
  (1,'BCG'),
  (2,'DPT-HB-Hib 1'),(3,'DPT-HB-Hib 2'),(4,'DPT-HB-Hib 3'),(5,'DPT-HB-Hib 4'),
  (6,'Polio 1'),(7,'Polio 2'),(8,'Polio 3'),(9,'Polio 4'),
  (10,'IPV 1'),(11,'IPV 2'),
  (12,'PCV 1'),(13,'PCV 2'),(14,'PCV 3'),
  (15,'Rota 1'),(16,'Rota 2'),(17,'Rota 3'),
  (18,'MR 1'),(19,'MR 2')
on conflict do nothing;

-- ---------- INDEXES ----------
create index if not exists idx_laporan_posyandu_tanggal on laporan_posyandu (tanggal_kegiatan);
create index if not exists idx_laporan_posyandu_posyandu on laporan_posyandu (posyandu_id);
create index if not exists idx_laporan_antigen_laporan on laporan_antigen (laporan_id);

-- ==========================================================
-- ROW LEVEL SECURITY
-- ==========================================================
alter table posyandu enable row level security;
alter table users_app enable row level security;
alter table laporan_posyandu enable row level security;
alter table laporan_antigen enable row level security;

-- Semua role yang sudah login (authenticated) boleh SELECT posyandu & master_antigen
create policy "posyandu_select_all" on posyandu for select using (auth.role() = 'authenticated');
create policy "posyandu_write_admin" on posyandu for all using (
  exists (select 1 from users_app u where u.id = auth.uid() and u.role = 'admin')
);

create policy "users_app_select_self_or_admin" on users_app for select using (
  auth.uid() = id or exists (select 1 from users_app u where u.id = auth.uid() and u.role = 'admin')
);
create policy "users_app_write_admin" on users_app for all using (
  exists (select 1 from users_app u where u.id = auth.uid() and u.role = 'admin')
);

-- laporan_posyandu: admin full akses, kapus read-only, petugas insert+select+update(sendiri)
create policy "laporan_select_all" on laporan_posyandu for select using (auth.role() = 'authenticated');
create policy "laporan_insert_admin_petugas" on laporan_posyandu for insert with check (
  exists (select 1 from users_app u where u.id = auth.uid() and u.role in ('admin','petugas'))
);
create policy "laporan_update_admin_petugas" on laporan_posyandu for update using (
  exists (select 1 from users_app u where u.id = auth.uid() and u.role in ('admin','petugas'))
);
create policy "laporan_delete_admin" on laporan_posyandu for delete using (
  exists (select 1 from users_app u where u.id = auth.uid() and u.role = 'admin')
);

-- laporan_antigen mengikuti hak yang sama
create policy "antigen_select_all" on laporan_antigen for select using (auth.role() = 'authenticated');
create policy "antigen_write_admin_petugas" on laporan_antigen for all using (
  exists (select 1 from users_app u where u.id = auth.uid() and u.role in ('admin','petugas'))
);

-- NOTE: Karena akun 'petugas' bersifat SATU akun bersama untuk semua posyandu,
-- pembatasan "hanya boleh edit data posyandu miliknya" TIDAK bisa dilakukan di level RLS
-- (karena secara auth semua posyandu punya hak yang sama untuk role petugas).
-- Pembatasan ini diterapkan di level UI: petugas hanya melihat & mengedit laporan
-- dari posyandu yang mereka pilih/kerjakan di sesi tersebut.
