-- ====================================================================
-- MIGRASI DATABASE CAKRA: INTEGRASI GOOGLE FORM & INPUT MANUAL PERMINTAAN
-- Jalankan skrip ini di Supabase SQL Editor
-- ====================================================================

-- 1. UBAH TABEL `permintaan`
-- pemohon_id jadi nullable, tambah kolom identitas fallback
alter table public.permintaan alter column pemohon_id drop not null;

alter table public.permintaan add column if not exists pemohon_email text;
alter table public.permintaan add column if not exists pemohon_nama_manual text;
alter table public.permintaan add column if not exists sumber text not null default 'web';
alter table public.permintaan add column if not exists diinput_oleh uuid references public.profiles(id);

-- Tambahkan check constraint untuk sumber dan identitas pemohon
alter table public.permintaan drop constraint if exists check_sumber;
alter table public.permintaan add constraint check_sumber check (sumber in ('web', 'form', 'manual_admin'));

alter table public.permintaan drop constraint if exists permintaan_pemohon_check;
alter table public.permintaan add constraint permintaan_pemohon_check check (pemohon_id is not null or pemohon_email is not null);

-- 2. UPDATE TRIGGER `handle_new_user()` — TAMBAHKAN LANGKAH KLAIM OTOMATIS
create or replace function public.handle_new_user()
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

-- 3. RLS POLICY BARU UNTUK INSERT PENGELOLA / PIMPINAN / ADMIN
drop policy if exists "permintaan_insert_by_staff" on public.permintaan;
create policy "permintaan_insert_by_staff" on public.permintaan for insert with check (
  get_user_role(auth.uid()) in ('pengelola', 'pimpinan', 'admin')
);

-- 4. VIEW `profiles_with_email` UNTUK LOOKUP EMAIL PROFILE
create or replace view public.profiles_with_email as
select p.id, p.nama_lengkap, p.unit_kerja, p.role, u.email, p.avatar_url, p.created_at
from public.profiles p
join auth.users u on u.id = p.id;

-- Expose view ke REST API dengan security invoker
alter view public.profiles_with_email set (security_invoker = true);
