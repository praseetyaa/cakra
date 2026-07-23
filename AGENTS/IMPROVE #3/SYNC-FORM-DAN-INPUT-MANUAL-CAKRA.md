# SYNC-FORM-DAN-INPUT-MANUAL-CAKRA.md

## Fitur: Integrasi Google Form → Web, dan Input Manual Permintaan oleh Pengelola/Pimpinan/Admin

Dokumen ini adalah tambahan untuk `AGENTS.md`, `SRS-CAKRA.md`, dan `DATABASE-CAKRA.md`. Baca ketiganya dulu, terutama section 5.1 di `AGENTS.md` (alur Google OAuth + `user_provisioning`) — fitur ini adalah **perluasan langsung dari pola yang sama**, cuma diterapkan ke tabel `permintaan`, bukan cuma `profiles`.

---

## 1. Konteks & Keputusan Desain

Ada 2 kebutuhan yang ternyata punya akar masalah yang sama:

1. **Google Form** (untuk pegawai yang belum/nggak mau pakai web) — response Form perlu masuk ke `permintaan`, tapi Form-submitter belum tentu pernah login ke web (belum punya row di `profiles`).
2. **Input manual oleh pengelola/pimpinan/admin** — mereka perlu bisa input permintaan atas nama orang lain yang belum tentu juga pernah login.

**Masalah bersama:** `permintaan.pemohon_id` di skema saat ini adalah `NOT NULL` FK ke `profiles.id`, yang cuma ada setelah orang login via Google minimal sekali. Kalau tetap `NOT NULL`, kedua fitur di atas nggak bisa jalan untuk orang yang belum pernah login.

**Keputusan:** perluas skema supaya `permintaan` bisa punya **pemohon "belum terklaim"** (identified by email, belum tentu py akun), lalu otomatis "diklaim" begitu orang itu login pertama kali — persis seperti `user_provisioning` meng-claim role. Satu mekanisme, dipakai untuk 2 sumber input (Form & manual). **Tidak perlu staging table terpisah** — lebih simpel dan konsisten.

---

## 2. Perubahan Skema Database

Jalankan di Supabase SQL Editor, urut sesuai nomor.

### 2.1 Ubah tabel `permintaan`

```sql
-- pemohon_id jadi nullable, tambah kolom identitas fallback
alter table permintaan alter column pemohon_id drop not null;
alter table permintaan add column pemohon_email text;
alter table permintaan add column pemohon_nama_manual text;
alter table permintaan add column sumber text not null default 'web' check (sumber in ('web','form','manual_admin'));
alter table permintaan add column diinput_oleh uuid references profiles(id);

-- pastikan minimal salah satu identitas pemohon ada
alter table permintaan add constraint permintaan_pemohon_check
  check (pemohon_id is not null or pemohon_email is not null);
```

Penjelasan kolom baru:
- `pemohon_email` — WAJIB diisi kalau `pemohon_id` masih null. Ini kunci untuk proses klaim otomatis nanti.
- `pemohon_nama_manual` — nama tampilan sementara selama `pemohon_id` masih null (begitu diklaim, tampilkan `profiles.nama_lengkap` sebagai gantinya).
- `sumber` — buat tracking asal permintaan (`web` = pemohon isi sendiri di web, `form` = dari Google Form, `manual_admin` = diinput pengelola/pimpinan/admin atas nama orang lain).
- `diinput_oleh` — kalau `sumber = 'manual_admin'`, catat siapa pengelola/pimpinan/admin yang menginput (bukan yang menyetujui — beda dengan `disetujui_oleh`).

### 2.2 Update trigger `handle_new_user()` — tambahkan langkah klaim

Ganti fungsi yang sudah ada (dari `setup_user_provisioning.sql`) dengan versi ini — tambahan ada di bagian akhir (klaim permintaan):

```sql
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

  -- BARU: klaim semua permintaan lama (dari Form / input manual) yang atas nama email ini
  update public.permintaan
    set pemohon_id = new.id
    where pemohon_email = new.email and pemohon_id is null;

  return new;
end;
$$ language plpgsql security definer;
```

> Efeknya: begitu seseorang login Google pertama kali, seluruh riwayat permintaan yang sebelumnya masuk lewat Form atau diinput manual pengelola atas nama dia, **langsung muncul di akun webnya** — tanpa migrasi manual apapun.

### 2.3 RLS Policy Baru

Policy `permintaan_insert` yang lama (`with check (pemohon_id = auth.uid())`) akan **memblokir** pengelola/pimpinan/admin yang mau input atas nama orang lain, dan juga memblokir insert dari Apps Script (yang jalan pakai service role, bukan sebagai user tertentu). Tambahkan policy baru, jangan hapus yang lama:

```sql
-- pengelola/pimpinan/admin boleh insert permintaan atas nama siapapun
create policy "permintaan_insert_by_staff" on permintaan for insert with check (
  get_user_role(auth.uid()) in ('pengelola','pimpinan','admin')
);
```

> Pakai `get_user_role()` (fungsi `security definer` dari `AGENTS/fix_profiles_policy.sql`), JANGAN subquery langsung ke `profiles` — itu penyebab bug infinite recursion yang pernah kejadian di project ini.

Insert dari Google Apps Script pakai **service role key** (bypass RLS sepenuhnya by design di Supabase) — jadi nggak butuh policy tambahan untuk jalur Form, tapi tetap simpan service role key di Apps Script Script Properties, JANGAN hardcode di kode.

### 2.4 Update `permintaan_select`

Cek lagi policy select yang sudah ada — harusnya sudah aman karena pengelola/pimpinan/admin lihat semua by role. Tapi pemohon asli (`pemohon_id = auth.uid()`) otomatis bisa lihat riwayatnya begitu permintaan lama ter-klaim (section 2.2), jadi **tidak perlu policy tambahan** di sini.

---

## 3. Integrasi Google Form → Supabase (Apps Script)

### 3.1 Setup Google Form

- Buat Form "Permintaan Barang CAKRA" dengan field: Nama Barang (dropdown, isi manual dari daftar `barang` — lihat catatan di 3.3), Jumlah, Keperluan, Catatan (opsional), Unit Kerja
- **Settings → Responses → Collect email addresses → pilih "Verified"** (wajib sign-in Google, email dijamin akurat — ini kunci supaya `pemohon_email` bisa dipercaya)
- Hubungkan Form ke Google Sheet seperti biasa (Responses → Link to Sheets)

### 3.2 Apps Script (dipasang di Sheet yang terhubung ke Form)

Extensions → Apps Script, buat trigger `onFormSubmit`:

```javascript
const SUPABASE_URL = 'https://xxxx.supabase.co'; // ganti sesuai project
const SUPABASE_SERVICE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');

function onFormSubmit(e) {
  const response = e.namedValues;
  const emailPemohon = response['Alamat Email'][0]; // otomatis dari Verified email collection
  const namaBarang = response['Nama Barang'][0];
  const jumlah = parseInt(response['Jumlah'][0], 10);
  const unitKerja = response['Unit Kerja'][0];
  const keperluan = response['Keperluan'][0] || '';
  const catatan = response['Catatan'][0] || '';

  // 1. Cek apakah email ini sudah punya profile
  const profileRes = supabaseGet(`profiles?email_lookup=${encodeURIComponent(emailPemohon)}`);
  // NOTE: profiles TIDAK punya kolom email langsung (email ada di auth.users).
  // Gunakan RPC/view khusus — lihat section 3.4 untuk setup view `profiles_with_email`.

  const pemohonId = profileRes && profileRes.length > 0 ? profileRes[0].id : null;

  // 2. Cari barang_id dari nama barang (exact match)
  const barangRes = supabaseGet(`barang?nama=eq.${encodeURIComponent(namaBarang)}&select=id`);
  if (!barangRes || barangRes.length === 0) {
    notifyAdminBarangTidakDitemukan(namaBarang, emailPemohon);
    return; // jangan insert kalau barang nggak ketemu, supaya nggak ada permintaan_detail yatim
  }
  const barangId = barangRes[0].id;

  // 3. Insert permintaan (header)
  const permintaan = supabasePost('permintaan', {
    pemohon_id: pemohonId,
    pemohon_email: emailPemohon,
    unit_kerja: unitKerja,
    keperluan: keperluan,
    catatan: catatan,
    sumber: 'form',
  });

  // 4. Insert permintaan_detail
  supabasePost('permintaan_detail', {
    permintaan_id: permintaan[0].id,
    barang_id: barangId,
    jumlah: jumlah,
  });
}

function supabasePost(table, body) {
  const res = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    payload: JSON.stringify(body),
  });
  return JSON.parse(res.getContentText());
}

function supabaseGet(pathWithQuery) {
  const res = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  return JSON.parse(res.getContentText());
}

function notifyAdminBarangTidakDitemukan(nama, email) {
  MailApp.sendEmail({
    to: 'admin@paKajen.go.id', // ganti sesuai email admin
    subject: 'CAKRA: Barang tidak ditemukan dari Form',
    body: `Permintaan dari ${email} untuk barang "${nama}" gagal diproses karena nama barang tidak cocok dengan data di sistem. Cek manual ya.`,
  });
}
```

Simpan `SUPABASE_SERVICE_KEY` di **Project Settings → Script Properties** (Apps Script), jangan hardcode di source.

Pasang trigger: Apps Script Editor → Triggers (ikon jam) → Add Trigger → pilih fungsi `onFormSubmit`, event "On form submit".

### 3.3 Catatan Penting: Sinkronisasi Daftar Barang di Dropdown Form

Dropdown "Nama Barang" di Form **tidak otomatis update** dari tabel `barang` — ini harus di-maintain manual oleh admin (copy nama barang dari halaman Persediaan ke Form) setiap kali ada barang baru/nama berubah. Untuk MVP ini cukup, tapi kalau ke depannya sering berubah, bisa dibikin script terpisah yang generate ulang dropdown Form dari Supabase (pakai Google Forms API) — masukkan ini ke backlog kalau relevan.

### 3.4 Setup Tambahan: View untuk Lookup Email

`profiles` tidak punya kolom email langsung (email ada di `auth.users`, yang tidak bisa diakses lewat REST API biasa). Buat view di Supabase supaya Apps Script bisa lookup profile by email:

```sql
create view profiles_with_email as
select p.id, p.nama_lengkap, p.unit_kerja, p.role, u.email
from profiles p
join auth.users u on u.id = p.id;

-- expose view ke REST API (Supabase otomatis expose semua public view, tapi pastikan RLS-nya benar)
alter view profiles_with_email set (security_invoker = true);
```

Lalu di Apps Script, ganti query lookup jadi `profiles_with_email?email=eq.${email}&select=id`.

---

## 4. Input Manual Permintaan oleh Pengelola/Pimpinan/Admin

### 4.1 Halaman Baru: `app/(dashboard)/permintaan/manual/page.tsx`

Hanya bisa diakses role `pengelola`, `pimpinan`, `admin` (redirect kalau bukan).

**Form pemohon** — field-nya disamakan dengan struktur `profiles` (sesuai request kamu), supaya begitu orangnya login Google pertama kali, datanya nyambung otomatis:

```
┌─ Data Pemohon ──────────────────────────┐
│ Cari pemohon yang sudah terdaftar:       │  <- autocomplete dari profiles_with_email
│ [搜索_______________]                     │
│                                            │
│ -- atau input pemohon baru (belum login) --
│ Nama Lengkap*    [___________]            │
│ Email*           [___________]            │
│ Unit Kerja       [___________]            │
└────────────────────────────────────────┘

┌─ Detail Permintaan ─────────────────────┐
│ Barang & Jumlah (multi-item, sama kaya   │
│ form permintaan biasa)                    │
│ Keperluan        [___________]            │
│ Catatan          [___________]            │
└────────────────────────────────────────┘
```

Logic:
- Kalau pengelola pilih dari autocomplete (pemohon sudah terdaftar) → set `pemohon_id` langsung
- Kalau pengelola isi manual (nama + email baru) → set `pemohon_id = null`, `pemohon_email`, `pemohon_nama_manual`
- **Bonus konsisten dengan pola provisioning:** kalau email yang diinput belum ada di `user_provisioning` juga, tawarkan checkbox "Sekalian daftarkan sebagai user (isi role & unit kerja di provisioning)" — supaya begitu orang itu login pertama kali, role-nya juga udah kesetel, bukan cuma permintaan-nya yang keklaim. Opsional, defaultnya unchecked.

### 4.2 Server Action Baru: `app/actions/permintaan-manual.ts`

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ItemInput = { barang_id: string; jumlah: number }

export async function createPermintaanManual(input: {
  pemohon_id: string | null
  pemohon_nama_manual: string | null
  pemohon_email: string
  unit_kerja: string
  keperluan: string
  catatan: string
  items: ItemInput[]
  daftarkan_provisioning?: boolean
  role_provisioning?: 'pemohon' | 'pengelola' | 'pimpinan' | 'admin'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (input.daftarkan_provisioning && !input.pemohon_id) {
    await supabase.from('user_provisioning').upsert({
      email: input.pemohon_email,
      nama_lengkap: input.pemohon_nama_manual,
      unit_kerja: input.unit_kerja,
      role: input.role_provisioning || 'pemohon',
    })
  }

  const { data: permintaan, error } = await supabase
    .from('permintaan')
    .insert({
      pemohon_id: input.pemohon_id,
      pemohon_email: input.pemohon_email,
      pemohon_nama_manual: input.pemohon_id ? null : input.pemohon_nama_manual,
      unit_kerja: input.unit_kerja,
      keperluan: input.keperluan,
      catatan: input.catatan,
      sumber: 'manual_admin',
      diinput_oleh: user?.id,
    })
    .select()
    .single()

  if (error || !permintaan) return { success: false, error: error?.message }

  const details = input.items.map((item) => ({
    permintaan_id: permintaan.id,
    barang_id: item.barang_id,
    jumlah: item.jumlah,
  }))
  const { error: detailError } = await supabase.from('permintaan_detail').insert(details)
  if (detailError) return { success: false, error: detailError.message }

  revalidatePath('/permintaan')
  return { success: true, nomor: permintaan.nomor }
}
```

### 4.3 Tampilan Permintaan dari Sumber Non-Web

Di `ListPermintaan.tsx` dan `permintaan/[id]/page.tsx`, tampilkan:
- Badge kecil sesuai `sumber` (misal ikon Google Form / ikon "Input Manual") supaya pengelola/pimpinan tahu asalnya
- Nama pemohon: kalau `pemohon_id` ada → tampilkan `profiles.nama_lengkap` (join biasa); kalau null → tampilkan `pemohon_nama_manual` + label kecil "(belum terhubung akun)"

---

## 5. Definition of Done

- [ ] Kolom baru di `permintaan` sudah ditambahkan (`pemohon_email`, `pemohon_nama_manual`, `sumber`, `diinput_oleh`), `pemohon_id` sudah nullable
- [ ] Trigger `handle_new_user()` sudah diupdate — dites: buat permintaan manual dengan email X yang belum py akun, lalu login pakai akun Google email X → permintaan tadi otomatis muncul di riwayat pemohon
- [ ] RLS `permintaan_insert_by_staff` sudah dites — pemohon biasa (`role='pemohon'`) TETAP tidak bisa insert permintaan atas nama orang lain
- [ ] Form Google sudah di-setting "Verified" email collection
- [ ] Apps Script jalan end-to-end: submit Form → row muncul di `permintaan` (Supabase), baik untuk email yang sudah py profile maupun belum
- [ ] Kalau nama barang di Form nggak match apapun di tabel `barang`, admin dapat notifikasi email, TIDAK ada row `permintaan` yatim tanpa detail
- [ ] Halaman `/permintaan/manual` cuma bisa diakses pengelola/pimpinan/admin
- [ ] Input manual dengan pemohon baru (belum py akun) tersimpan benar dengan `pemohon_id = null` + `pemohon_email` terisi
- [ ] List & detail permintaan menampilkan sumber & status klaim pemohon dengan jelas

---

## 6. Update ke Dokumen Lain (jangan lupa)

- **`AGENTS.md`** — tambahkan section baru "5.2 Alur Pemohon Belum Terklaim (Ghost Pemohon)" yang merangkum section 1-2 dokumen ini, plus tambahkan `permintaan/manual/page.tsx` dan `app/actions/permintaan-manual.ts` ke struktur folder
- **`DATABASE-CAKRA.md`** — tambahkan section 2.1 dan seterusnya di atas ke skema utama (jangan biarkan jadi migrasi terpisah yang gampang kelewat kalau rebuild dari nol)
- **`SRS-CAKRA.md`** — tambahkan FR baru: FR-3.8 (input manual oleh staff), FR-9.x (integrasi Google Form)
