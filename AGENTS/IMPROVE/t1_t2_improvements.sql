-- ==============================================================================
-- CAKRA MIGRATION: T1 (Validasi Stok Approval) & T2 (Policy Update Role Admin)
-- Jalankan skrip ini di Supabase SQL Editor
-- ==============================================================================

-- 1. T1: Update fungsi trigger handle_approval() dengan Validasi Stok
create or replace function handle_approval()
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

    -- STEP PENGURANGAN STOK & PENCATATAN RIWAYAT
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


-- 2. T2: RLS Policy untuk Admin memperbarui Role User lain
-- Hapus policy jika sudah ada
drop policy if exists "profiles_update_role_by_admin" on profiles;

-- Gunakan get_user_role() untuk menghindari infinite recursion pada tabel profiles
create policy "profiles_update_role_by_admin" on profiles for update
  using (get_user_role(auth.uid()) = 'admin');
