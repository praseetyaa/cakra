# Database Schema — Aplikasi CAKRA
## PostgreSQL (Supabase)

Jalankan seluruh SQL di bawah ini secara berurutan di **Supabase SQL Editor**.

---

## 1. Extension & Setup Awal

```sql
create extension if not exists "uuid-ossp";
```

---

## 2. Tabel `profiles`

Menyimpan data tambahan user di luar `auth.users` bawaan Supabase.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama_lengkap text not null,
  unit_kerja text,
  role text not null default 'pemohon' check (role in ('pemohon','pengelola','pimpinan','admin')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Trigger otomatis buat profile saat user baru register
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nama_lengkap, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama_lengkap', new.email), 'pemohon');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 3. Tabel `kategori_barang`

```sql
create table kategori_barang (
  id uuid primary key default uuid_generate_v4(),
  nama text not null unique
);
```

---

## 4. Tabel `barang`

```sql
create table barang (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  kategori_id uuid references kategori_barang(id),
  satuan text not null,
  stok integer not null default 0,
  stok_minimum integer not null default 0,
  lokasi text default 'Gudang Persediaan',
  updated_at timestamptz default now()
);

-- Kolom status dihitung otomatis (generated column)
alter table barang add column status text
  generated always as (
    case when stok <= stok_minimum then 'Menipis' else 'Aman' end
  ) stored;
```

---

## 5. Tabel `permintaan`

```sql
create table permintaan (
  id uuid primary key default uuid_generate_v4(),
  nomor text unique not null,
  pemohon_id uuid references profiles(id) not null,
  unit_kerja text,
  keperluan text,
  catatan text,
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak')),
  tanggal timestamptz default now(),
  disetujui_oleh uuid references profiles(id),
  tanggal_keputusan timestamptz
);

-- Sequence untuk nomor otomatis PRM-XXXX
create sequence permintaan_nomor_seq start 1;

create function generate_nomor_permintaan()
returns trigger as $$
begin
  new.nomor := 'PRM-' || lpad(nextval('permintaan_nomor_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_nomor_permintaan
  before insert on permintaan
  for each row execute procedure generate_nomor_permintaan();
```

---

## 6. Tabel `permintaan_detail`

```sql
create table permintaan_detail (
  id uuid primary key default uuid_generate_v4(),
  permintaan_id uuid references permintaan(id) on delete cascade,
  barang_id uuid references barang(id),
  jumlah integer not null check (jumlah > 0)
);
```

---

## 7. Tabel `riwayat_stok`

```sql
create table riwayat_stok (
  id uuid primary key default uuid_generate_v4(),
  barang_id uuid references barang(id),
  jumlah integer not null, -- negatif = keluar, positif = masuk
  jenis text not null check (jenis in ('keluar','masuk','penyesuaian')),
  referensi_id uuid, -- link ke permintaan.id jika keluar via approval
  keterangan text,
  created_at timestamptz default now()
);
```

---

## 8. Tabel `notifikasi`

```sql
create table notifikasi (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  judul text not null,
  pesan text,
  jenis text check (jenis in ('permintaan_baru','disetujui','ditolak','stok_menipis')),
  dibaca boolean default false,
  created_at timestamptz default now()
);
```

---

## 9. Trigger Otomatis: Approval → Update Stok + Notifikasi

Ini trigger paling penting — jalan saat status permintaan berubah jadi `disetujui`.

```sql
create function handle_approval()
returns trigger as $$
declare
  item record;
  sisa_stok integer;
begin
  if new.status = 'disetujui' and old.status = 'menunggu' then
    -- STEP VALIDASI: Cek ketersediaan stok untuk SEMUA item sebelum ada perubahan stok
    for item in
      select pd.jumlah, b.nama, b.stok
      from permintaan_detail pd
      join barang b on b.id = pd.barang_id
      where pd.permintaan_id = new.id
    loop
      if item.stok < item.jumlah then
        raise exception 'Stok % tidak mencukupi (tersedia: %, diminta: %)',
          item.nama, item.stok, item.jumlah
          using errcode = 'P0001', hint = 'STOCK_INSUFFICIENT';
      end if;
    end loop;

    -- loop semua item di permintaan ini
    for item in
      select * from permintaan_detail where permintaan_id = new.id
    loop
      update barang
        set stok = stok - item.jumlah, updated_at = now()
        where id = item.barang_id
        returning stok into sisa_stok;

      insert into riwayat_stok (barang_id, jumlah, jenis, referensi_id, keterangan)
      values (item.barang_id, -item.jumlah, 'keluar', new.id, 'Persetujuan ' || new.nomor);

      -- cek stok menipis, kirim notifikasi ke pengelola
      if sisa_stok <= (select stok_minimum from barang where id = item.barang_id) then
        insert into notifikasi (user_id, judul, pesan, jenis)
        select id, 'Stok Menipis',
               (select nama from barang where id = item.barang_id) || ' tersisa ' || sisa_stok,
               'stok_menipis'
        from profiles where role = 'pengelola';
      end if;
    end loop;

    -- notifikasi ke pemohon
    insert into notifikasi (user_id, judul, pesan, jenis)
    values (new.pemohon_id, 'Permintaan Disetujui', new.nomor || ' telah disetujui', 'disetujui');
  end if;

  if new.status = 'ditolak' and old.status = 'menunggu' then
    insert into notifikasi (user_id, judul, pesan, jenis)
    values (new.pemohon_id, 'Permintaan Ditolak', new.nomor || ' telah ditolak', 'ditolak');
  end if;

  new.tanggal_keputusan := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_permintaan_approval
  before update on permintaan
  for each row execute procedure handle_approval();
```

---

## 10. Row Level Security (RLS)

```sql
alter table profiles enable row level security;
alter table barang enable row level security;
alter table permintaan enable row level security;
alter table permintaan_detail enable row level security;
alter table riwayat_stok enable row level security;
alter table notifikasi enable row level security;

-- Helper function to fetch user role securely bypassing RLS (to avoid infinite recursion)
create or replace function public.get_user_role(user_id uuid)
returns text as $$
  select role from public.profiles where id = user_id;
$$ language sql security definer;

-- PROFILES: user bisa lihat & update profil sendiri; pengelola/pimpinan/admin bisa lihat semua; admin bisa ubah role
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or get_user_role(auth.uid()) in ('pengelola','pimpinan','admin'));
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id);
create policy "profiles_update_role_by_admin" on profiles for update
  using (get_user_role(auth.uid()) = 'admin');

-- BARANG: semua user login bisa lihat; hanya pengelola/admin bisa insert/update
create policy "barang_select" on barang for select using (auth.role() = 'authenticated');
create policy "barang_insert" on barang for insert with check (
  get_user_role(auth.uid()) in ('pengelola','admin')
);
create policy "barang_update" on barang for update using (
  get_user_role(auth.uid()) in ('pengelola','admin')
);

-- PERMINTAAN: pemohon lihat & buat punya sendiri; pengelola/pimpinan lihat semua & bisa update (approval)
create policy "permintaan_select" on permintaan for select using (
  pemohon_id = auth.uid() or get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);
create policy "permintaan_insert" on permintaan for insert with check (pemohon_id = auth.uid());
create policy "permintaan_update_approval" on permintaan for update using (
  get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);

-- PERMINTAAN_DETAIL: ikut aturan permintaan induknya
create policy "permintaan_detail_select" on permintaan_detail for select using (
  exists (
    select 1 from permintaan p 
    where p.id = permintaan_id 
    and (p.pemohon_id = auth.uid() or get_user_role(auth.uid()) in ('pengelola','pimpinan','admin'))
  )
);
create policy "permintaan_detail_insert" on permintaan_detail for insert with check (
  exists (select 1 from permintaan p where p.id = permintaan_id and p.pemohon_id = auth.uid())
);

-- RIWAYAT_STOK: hanya pengelola/pimpinan/admin
create policy "riwayat_stok_select" on riwayat_stok for select using (
  get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);

-- NOTIFIKASI: hanya untuk diri sendiri
create policy "notifikasi_select" on notifikasi for select using (user_id = auth.uid());
create policy "notifikasi_update" on notifikasi for update using (user_id = auth.uid());

-- KATEGORI_BARANG: semua user authenticated bisa lihat dan tambah (untuk auto-seed)
alter table kategori_barang enable row level security;
create policy "kategori_barang_select" on kategori_barang for select using (auth.role() = 'authenticated');
create policy "kategori_barang_insert" on kategori_barang for insert with check (auth.role() = 'authenticated');
```

---

## 11. Realtime (untuk notifikasi live)

Aktifkan realtime di Supabase Dashboard → Database → Replication, untuk tabel:
- `notifikasi`
- `permintaan`

Atau via SQL:
```sql
alter publication supabase_realtime add table notifikasi;
alter publication supabase_realtime add table permintaan;
```

---

## 12. Entity Relationship Diagram (Ringkas)

```
profiles ──< permintaan >── permintaan_detail >── barang
   │                                                  │
   └──< notifikasi                     riwayat_stok ──┘
```

- 1 profile bisa punya banyak permintaan
- 1 permintaan bisa punya banyak permintaan_detail (multi-item)
- 1 barang bisa muncul di banyak permintaan_detail & riwayat_stok
- 1 profile bisa punya banyak notifikasi
