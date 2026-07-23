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
```

> Trigger `handle_new_user()` dibuat di **section 2.1**, setelah tabel `user_provisioning`, karena trigger tersebut butuh membaca tabel itu. Jalankan section 2 dan 2.1 secara berurutan.

---

## 2.1 Tabel `user_provisioning` — Pre-Assign Role Sebelum User Login

Karena UUID user baru terbentuk saat pertama kali login (bukan sebelumnya), role/unit_kerja untuk user yang **belum pernah login** harus disimpan berdasarkan **email**, bukan UUID. Admin mengisi tabel ini manual atau lewat UI /pengguna untuk pegawai yang sudah diketahui perannya (admin, pengelola, pimpinan), sebelum orang tersebut login pertama kali.

```sql
create table user_provisioning (
  email text primary key,
  nama_lengkap text,
  unit_kerja text,
  role text not null default 'pemohon' check (role in ('pemohon','pengelola','pimpinan','admin')),
  created_at timestamptz default now()
);

alter table user_provisioning enable row level security;

-- hanya admin yang boleh baca/tulis tabel ini
create policy "user_provisioning_admin_only" on user_provisioning for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Trigger: Buat Profile Otomatis Saat User Login/Register via Google

Cek dulu apakah email user ada di `user_provisioning`. Kalau ada, pakai role/unit_kerja/nama dari sana. Kalau tidak, default role `pemohon`. Nama & avatar diambil dari data Google (`raw_user_meta_data`), dengan fallback ke data provisioning.

```sql
create function public.handle_new_user()
returns trigger as $$
declare
  prov record;
begin
  select * into prov from public.user_provisioning where email = new.email;

  insert into public.profiles (id, nama_lengkap, unit_kerja, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', prov.nama_lengkap, new.email),
    prov.unit_kerja,
    coalesce(prov.role, 'pemohon'),
    new.raw_user_meta_data->>'avatar_url'
  );
  -- Klaim semua permintaan lama (dari Google Form / input manual) yang menggunakan email ini
  update public.permintaan
    set pemohon_id = new.id
    where pemohon_email = new.email and pemohon_id is null;

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
  pemohon_id uuid references profiles(id),
  pemohon_email text,
  pemohon_nama_manual text,
  sumber text not null default 'web' check (sumber in ('web','form','manual_admin')),
  diinput_oleh uuid references profiles(id),
  unit_kerja text,
  keperluan text,
  catatan text,
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak')),
  tanggal timestamptz default now(),
  disetujui_oleh uuid references profiles(id),
  tanggal_keputusan timestamptz,
  constraint permintaan_pemohon_check check (pemohon_id is not null or pemohon_email is not null)
);

-- View profiles dengan email untuk lookup Apps Script & Form
create or replace view public.profiles_with_email as
select p.id, p.nama_lengkap, p.unit_kerja, p.role, u.email, p.avatar_url, p.created_at
from public.profiles p
join auth.users u on u.id = p.id;
alter view public.profiles_with_email set (security_invoker = true);

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

```sql
create or replace function handle_approval()
returns trigger as $$
declare
  item record;
  sisa_stok integer;
begin
  if new.status = 'disetujui' and old.status = 'menunggu' then
    -- Guard: Validasi stok mencukupi untuk SEMUA item
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

    -- Potong stok
    for item in
      select * from permintaan_detail where permintaan_id = new.id
    loop
      update barang
        set stok = stok - item.jumlah, updated_at = now()
        where id = item.barang_id
        returning stok into sisa_stok;

      insert into riwayat_stok (barang_id, jumlah, jenis, referensi_id, keterangan)
      values (item.barang_id, -item.jumlah, 'keluar', new.id, 'Persetujuan ' || new.nomor);

      if sisa_stok <= (select stok_minimum from barang where id = item.barang_id) then
        insert into notifikasi (user_id, judul, pesan, jenis)
        select id, 'Stok Menipis',
               (select nama from barang where id = item.barang_id) || ' tersisa ' || sisa_stok,
               'stok_menipis'
        from profiles where role = 'pengelola';
      end if;
    end loop;

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

create policy "profiles_select" on profiles for select
  using (auth.uid() = id or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('pengelola','pimpinan','admin')
  ));
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id);

create policy "barang_select" on barang for select using (auth.role() = 'authenticated');
create policy "barang_insert" on barang for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('pengelola','admin'))
);
create policy "barang_update" on barang for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('pengelola','admin'))
);

create policy "permintaan_select" on permintaan for select using (
  pemohon_id = auth.uid() or exists (
    select 1 from profiles where id = auth.uid() and role in ('pengelola','pimpinan','admin')
  )
);
create policy "permintaan_insert" on permintaan for insert with check (pemohon_id = auth.uid());
create policy "permintaan_update_approval" on permintaan for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('pengelola','pimpinan','admin'))
);

create policy "permintaan_detail_select" on permintaan_detail for select using (
  exists (select 1 from permintaan p where p.id = permintaan_id and (
    p.pemohon_id = auth.uid() or exists (
      select 1 from profiles where id = auth.uid() and role in ('pengelola','pimpinan','admin')
    )
  ))
);
create policy "permintaan_detail_insert" on permintaan_detail for insert with check (
  exists (select 1 from permintaan p where p.id = permintaan_id and p.pemohon_id = auth.uid())
);

create policy "riwayat_stok_select" on riwayat_stok for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('pengelola','pimpinan','admin'))
);

create policy "notifikasi_select" on notifikasi for select using (user_id = auth.uid());
create policy "notifikasi_update" on notifikasi for update using (user_id = auth.uid());
```
