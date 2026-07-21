-- Skrip SQL untuk Menambahkan 3 Kolom Kode BMN ke Tabel barang di Supabase
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor

ALTER TABLE public.barang 
ADD COLUMN IF NOT EXISTS kd_brng text,
ADD COLUMN IF NOT EXISTS kd_barang text,
ADD COLUMN IF NOT EXISTS kode_barang_lengkap text;

-- Reload Schema Cache PostgREST
NOTIFY pgrst, 'reload schema';
