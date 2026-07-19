-- 1. Buat fungsi helper security definer untuk mengambil role user
-- Fungsi ini berjalan bypass RLS (karena security definer) untuk menghindari loop rekursif
create or replace function public.get_user_role(user_id uuid)
returns text as $$
  select role from public.profiles where id = user_id;
$$ language sql security definer;

-- 2. Perbarui Policy pada tabel PROFILES
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or get_user_role(auth.uid()) in ('pengelola','pimpinan','admin'));

-- 3. Perbarui Policy pada tabel BARANG
drop policy if exists "barang_insert" on barang;
create policy "barang_insert" on barang for insert with check (
  get_user_role(auth.uid()) in ('pengelola','admin')
);

drop policy if exists "barang_update" on barang;
create policy "barang_update" on barang for update using (
  get_user_role(auth.uid()) in ('pengelola','admin')
);

-- 4. Perbarui Policy pada tabel PERMINTAAN
drop policy if exists "permintaan_select" on permintaan;
create policy "permintaan_select" on permintaan for select using (
  pemohon_id = auth.uid() or get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);

drop policy if exists "permintaan_update_approval" on permintaan;
create policy "permintaan_update_approval" on permintaan for update using (
  get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);

-- 5. Perbarui Policy pada tabel PERMINTAAN_DETAIL
drop policy if exists "permintaan_detail_select" on permintaan_detail;
create policy "permintaan_detail_select" on permintaan_detail for select using (
  exists (
    select 1 from permintaan p 
    where p.id = permintaan_id 
    and (p.pemohon_id = auth.uid() or get_user_role(auth.uid()) in ('pengelola','pimpinan','admin'))
  )
);

-- 6. Perbarui Policy pada tabel RIWAYAT_STOK
drop policy if exists "riwayat_stok_select" on riwayat_stok;
create policy "riwayat_stok_select" on riwayat_stok for select using (
  get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);
