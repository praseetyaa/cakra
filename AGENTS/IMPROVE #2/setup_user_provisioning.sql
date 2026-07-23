-- ========================================================
-- MIGRASI DATABASE CAKRA: USER PROVISIONING & GOOGLE OAUTH
-- Jalankan skrip ini di Supabase SQL Editor
-- ========================================================

-- 1. Buat Tabel user_provisioning
create table if not exists public.user_provisioning (
  email text primary key,
  nama_lengkap text,
  unit_kerja text,
  role text not null default 'pemohon' check (role in ('pemohon','pengelola','pimpinan','admin')),
  created_at timestamptz default now()
);

-- 2. Aktifkan Row Level Security (RLS)
alter table public.user_provisioning enable row level security;

-- 3. Policy RLS: Hanya Admin yang dapat membaca dan mengelola tabel ini
drop policy if exists "user_provisioning_admin_only" on public.user_provisioning;
create policy "user_provisioning_admin_only" on public.user_provisioning for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 4. Update Trigger Function handle_new_user()
create or replace function public.handle_new_user()
returns trigger as $$
declare
  prov record;
begin
  -- Cek apakah email pengguna ada di tabel user_provisioning
  select * into prov from public.user_provisioning where email = new.email;

  -- Insert profile baru dengan fallback ke Google Metadata atau provisioning
  insert into public.profiles (id, nama_lengkap, unit_kerja, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', prov.nama_lengkap, new.email),
    prov.unit_kerja,
    coalesce(prov.role, 'pemohon'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Pastikan Trigger terpasang di auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
