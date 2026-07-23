-- ========================================================
-- MIGRASI: TRIGGER NOTIFIKASI PERMINTAAN BARU
-- Jalankan skrip ini di Supabase SQL Editor
-- ========================================================

-- 1. Buat fungsi trigger untuk menangani notifikasi permintaan baru
create or replace function public.handle_new_permintaan()
returns trigger as $$
begin
  -- Kirim notifikasi permintaan baru ke seluruh user ber-role pengelola, pimpinan, dan admin
  insert into public.notifikasi (user_id, judul, pesan, jenis)
  select 
    id, 
    'Permintaan Baru', 
    'Permintaan ' || coalesce(new.nomor, 'Baru') || ' diajukan oleh Unit ' || coalesce(new.unit_kerja, 'Pemohon'), 
    'permintaan_baru'
  from public.profiles
  where role in ('pengelola', 'pimpinan', 'admin');
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Buat trigger setelah insert di tabel permintaan
drop trigger if exists on_permintaan_created on public.permintaan;
create trigger on_permintaan_created
  after insert on public.permintaan
  for each row execute procedure public.handle_new_permintaan();
