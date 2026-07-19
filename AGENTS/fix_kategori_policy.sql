-- Perbarui Policy pada tabel KATEGORI_BARANG
-- Memungkinkan semua user yang masuk (authenticated) untuk melihat dan menyemai (seed) kategori

drop policy if exists "kategori_barang_select" on kategori_barang;
create policy "kategori_barang_select" on kategori_barang for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "kategori_barang_insert" on kategori_barang;
create policy "kategori_barang_insert" on kategori_barang for insert with check (
  auth.role() = 'authenticated'
);
