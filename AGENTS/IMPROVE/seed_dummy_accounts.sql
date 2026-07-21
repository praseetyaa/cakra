-- ==============================================================================
-- CAKRA SEED SCRIPT: DUMMY ACCOUNTS (Pengelola, Pimpinan, Admin)
-- Jalankan skrip ini di Supabase SQL Editor
-- ==============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 1. Akun Dummy: Pengelola Stok
do $$
declare
  new_user_id uuid := uuid_generate_v4();
begin
  if not exists (select 1 from auth.users where email = 'pengelola@cakra.pa-kajen.go.id') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'pengelola@cakra.pa-kajen.go.id',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"nama_lengkap":"Ahmad Pengelola, S.Kom."}',
      now(), now()
    );

    update public.profiles
    set nama_lengkap = 'Ahmad Pengelola, S.Kom.',
        unit_kerja = 'Subbag Umum & Keuangan',
        role = 'pengelola'
    where id = new_user_id;
  else
    update public.profiles
    set role = 'pengelola'
    where id = (select id from auth.users where email = 'pengelola@cakra.pa-kajen.go.id');
  end if;
end $$;

-- 2. Akun Dummy: Pimpinan
do $$
declare
  new_user_id uuid := uuid_generate_v4();
begin
  if not exists (select 1 from auth.users where email = 'pimpinan@cakra.pa-kajen.go.id') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'pimpinan@cakra.pa-kajen.go.id',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"nama_lengkap":"Drs. H. Pimpinan Supriyadi, M.H."}',
      now(), now()
    );

    update public.profiles
    set nama_lengkap = 'Drs. H. Pimpinan Supriyadi, M.H.',
        unit_kerja = 'Pimpinan / Ketua PA Kajen',
        role = 'pimpinan'
    where id = new_user_id;
  else
    update public.profiles
    set role = 'pimpinan'
    where id = (select id from auth.users where email = 'pimpinan@cakra.pa-kajen.go.id');
  end if;
end $$;

-- 3. Akun Dummy: Administrator
do $$
declare
  new_user_id uuid := uuid_generate_v4();
begin
  if not exists (select 1 from auth.users where email = 'admin@cakra.pa-kajen.go.id') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'admin@cakra.pa-kajen.go.id',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"nama_lengkap":"Administrator Sistem CAKRA"}',
      now(), now()
    );

    update public.profiles
    set nama_lengkap = 'Administrator Sistem CAKRA',
        unit_kerja = 'Subbag PTIP / TIM IT',
        role = 'admin'
    where id = new_user_id;
  else
    update public.profiles
    set role = 'admin'
    where id = (select id from auth.users where email = 'admin@cakra.pa-kajen.go.id');
  end if;
end $$;
