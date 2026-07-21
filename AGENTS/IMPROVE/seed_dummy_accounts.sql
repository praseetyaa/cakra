-- ==============================================================================
-- CAKRA SEED SCRIPT: DUMMY ACCOUNTS (Pengelola, Pimpinan, Admin)
-- Jalankan skrip ini di Supabase SQL Editor
-- ==============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Hapus dulu jika sudah ada record partial agar dibuat ulang secara bersih
delete from auth.users where email in (
  'pengelola@cakra.pa-kajen.go.id',
  'pimpinan@cakra.pa-kajen.go.id',
  'admin@cakra.pa-kajen.go.id'
);

-- 1. Akun Dummy: Pengelola Stok
do $$
declare
  new_user_id uuid := uuid_generate_v4();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    'pengelola@cakra.pa-kajen.go.id',
    crypt('Password123!', gen_salt('bf', 10)),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama_lengkap":"Ahmad Pengelola, S.Kom."}',
    now(), now(),
    '', '', '', ''
  );

  update public.profiles
  set nama_lengkap = 'Ahmad Pengelola, S.Kom.',
      unit_kerja = 'Subbag Umum & Keuangan',
      role = 'pengelola'
  where id = new_user_id;
end $$;

-- 2. Akun Dummy: Pimpinan
do $$
declare
  new_user_id uuid := uuid_generate_v4();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    'pimpinan@cakra.pa-kajen.go.id',
    crypt('Password123!', gen_salt('bf', 10)),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama_lengkap":"Drs. H. Pimpinan Supriyadi, M.H."}',
    now(), now(),
    '', '', '', ''
  );

  update public.profiles
  set nama_lengkap = 'Drs. H. Pimpinan Supriyadi, M.H.',
      unit_kerja = 'Pimpinan / Ketua PA Kajen',
      role = 'pimpinan'
  where id = new_user_id;
end $$;

-- 3. Akun Dummy: Administrator
do $$
declare
  new_user_id uuid := uuid_generate_v4();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    'admin@cakra.pa-kajen.go.id',
    crypt('Password123!', gen_salt('bf', 10)),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama_lengkap":"Administrator Sistem CAKRA"}',
    now(), now(),
    '', '', '', ''
  );

  update public.profiles
  set nama_lengkap = 'Administrator Sistem CAKRA',
      unit_kerja = 'Subbag PTIP / TIM IT',
      role = 'admin'
  where id = new_user_id;
end $$;
