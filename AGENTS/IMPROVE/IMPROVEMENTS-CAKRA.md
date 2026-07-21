# IMPROVEMENTS-CAKRA.md — Rencana Peningkatan Aplikasi CAKRA

## Konteks

Dokumen ini adalah hasil review kode terhadap repo `github.com/praseetyaa/cakra` (live di `cakra.spandiv.xyz`), dibandingkan dengan `BRD-CAKRA.md`, `SRS-CAKRA.md`, `DATABASE-CAKRA.md`, dan `AGENTS.md`. Berisi daftar perbaikan & pengembangan yang belum ada di implementasi saat ini, disusun berdasarkan prioritas.

**Cara pakai dokumen ini (untuk AI coding agent):**
1. Baca dulu `AGENTS.md`, `SRS-CAKRA.md`, `DATABASE-CAKRA.md` sebelum mulai — dokumen ini adalah **tambahan**, bukan pengganti.
2. Kerjakan sesuai urutan prioritas (Tinggi → Sedang → Backlog). Jangan lompat kecuali diminta eksplisit oleh user.
3. Setiap item punya *Definition of Done* sendiri — jangan tandai selesai sebelum semua poin checklist terpenuhi.
4. Setelah item T1 & S1 selesai, **update `DATABASE-CAKRA.md`** supaya dokumen sumber tetap jadi source of truth yang akurat (lihat catatan di S1).

---

## 🔴 PRIORITAS TINGGI

### T1. Validasi Stok Sebelum Approval (memenuhi SRS FR-4.6)

**Masalah:** `handle_approval()` di database saat ini langsung memotong stok tanpa mengecek apakah stok mencukupi. Kalau pengelola approve permintaan 50 pcs padahal stok cuma 10, stok akan jadi **minus 40**. Tidak ada guard di trigger maupun di frontend.

**Solusi — Bagian 1: Guard di database trigger (wajib, ini yang jadi source of truth)**

Update fungsi `handle_approval()` di Supabase SQL Editor. Tambahkan loop validasi SEBELUM loop pengurangan stok yang sudah ada:

```sql
create or replace function handle_approval()
returns trigger as $$
declare
  item record;
  sisa_stok integer;
begin
  if new.status = 'disetujui' and old.status = 'menunggu' then

    -- STEP BARU: validasi stok cukup untuk SEMUA item, sebelum ada perubahan apapun
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

    -- Loop pengurangan stok (SUDAH ADA, jangan diubah, cuma dipindah ke bawah step validasi)
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
```

Karena `raise exception` terjadi di dalam transaksi trigger, kalau divalidasi gagal maka SELURUH update di dalam `before update` ini otomatis rollback — status `permintaan` juga tidak akan berubah jadi `disetujui`. Aman.

**Solusi — Bagian 2: Tangkap error di frontend (defense in depth, sesuai prinsip AGENTS.md)**

Di `app/actions/permintaan.ts`, fungsi `resolvePermintaan()`, tangkap error dari Supabase dan kembalikan pesan yang jelas ke UI:

```ts
export async function resolvePermintaan(id: string, status: 'disetujui' | 'ditolak') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('permintaan')
    .update({ status, disetujui_oleh: user?.id })
    .eq('id', id)

  if (error) {
    // Error dari raise exception di trigger akan masuk ke error.message
    if (error.message.includes('tidak mencukupi')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Gagal memproses permintaan. Coba lagi.' }
  }

  revalidatePath('/permintaan')
  return { success: true }
}
```

Di komponen `TombolApproval.tsx`, tampilkan `error` yang dikembalikan sebagai toast/alert sebelum user retry, alih-alih generic error.

**Bonus (opsional tapi disarankan):** tampilkan indikator stok tersedia vs diminta di halaman detail permintaan (`permintaan/[id]/page.tsx`) SEBELUM pengelola klik "Setujui" — supaya mereka tahu duluan tanpa harus gagal klik dulu.

**Definition of Done:**
- [ ] Trigger sudah divalidasi: approve permintaan dengan jumlah > stok tersedia harus gagal dengan pesan jelas, status permintaan TETAP "menunggu"
- [ ] Approve permintaan dengan jumlah <= stok tersedia tetap berjalan normal seperti sebelumnya
- [ ] Frontend menampilkan pesan error yang readable (bukan raw Postgres error)
- [ ] Ditest manual dengan minimal 1 skenario stok cukup dan 1 skenario stok tidak cukup

---

### T2. Halaman Kelola Role User

**Masalah:** Tidak ada UI untuk mengubah role user dari `pemohon` ke `pengelola`/`pimpinan`/`admin`. Trigger `handle_new_user()` selalu set role default `pemohon`. Satu-satunya cara mengangkat user sekarang adalah edit manual lewat Supabase SQL Editor — tidak sustainable untuk operasional harian.

**Solusi:**

**1. RLS Policy baru** (tambahkan ke `DATABASE-CAKRA.md` dan jalankan di Supabase):

```sql
-- Admin bisa update role user lain (profiles_update_own yang sudah ada cuma izinkan update diri sendiri)
create policy "profiles_update_role_by_admin" on profiles for update
  using (get_user_role(auth.uid()) = 'admin');
```

> Catatan: gunakan fungsi `get_user_role()` yang sudah ada di `AGENTS/fix_profiles_policy.sql` — JANGAN bikin subquery langsung ke `profiles` di dalam policy `profiles` (itu penyebab bug infinite recursion yang sudah pernah kejadian di project ini).

**2. Halaman baru:** `app/(dashboard)/pengguna/page.tsx` (hanya bisa diakses role `admin` — cek di server component, redirect kalau bukan admin)

Isi halaman:
- Tabel daftar semua user (nama, email, unit kerja, role saat ini)
- Dropdown/select untuk ubah role tiap baris (Pemohon / Pengelola / Pimpinan / Admin)
- Search/filter by nama atau email

**3. Server action baru:** `app/actions/pengguna.ts`

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function listUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, unit_kerja, role, created_at')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function updateUserRole(userId: string, newRole: 'pemohon' | 'pengelola' | 'pimpinan' | 'admin') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/pengguna')
  return { success: true }
}
```

**4. Tambahkan menu "Kelola Pengguna"** di `Sidebar.tsx` dan `BottomNav.tsx`, tapi hanya render kalau `role === 'admin'`.

**5. Update `AGENTS.md`** — tambahkan `pengguna/page.tsx` ke struktur folder dan `app/actions/pengguna.ts` ke daftar Server Actions.

**Definition of Done:**
- [ ] Halaman `/pengguna` cuma bisa diakses admin (user role lain redirect/403)
- [ ] Admin bisa lihat semua user & ubah role lewat UI, tanpa perlu SQL manual
- [ ] Perubahan role langsung berlaku (user lain tidak perlu login ulang untuk RLS baru berlaku, tapi UI/menu mereka baru update setelah refresh/login ulang — ini expected, cukup dicatat sebagai known behavior)
- [ ] RLS sudah dites: user non-admin tidak bisa update role siapapun lewat API langsung

---

## 🟡 PRIORITAS SEDANG

### S1. Sinkronkan `DATABASE-CAKRA.md` dengan Fix RLS yang Sudah Diterapkan

**Masalah:** `DATABASE-CAKRA.md` versi asli punya bug infinite recursion di policy `profiles_select` (subquery ke tabel `profiles` di dalam policy tabel `profiles` sendiri). Bug ini sudah diperbaiki di `AGENTS/fix_profiles_policy.sql` dan `AGENTS/fix_kategori_policy.sql`, tapi dokumen sumber `DATABASE-CAKRA.md` belum diupdate.

**Solusi:** Ganti seluruh bagian "10. Row Level Security (RLS)" di `DATABASE-CAKRA.md` dengan versi yang sudah pakai fungsi `get_user_role()` (`security definer`) alih-alih subquery langsung. Salin isi dari `AGENTS/fix_profiles_policy.sql` + `AGENTS/fix_kategori_policy.sql` sebagai pengganti bagian yang lama, dan tambahkan catatan di bagian atas dokumen menjelaskan kenapa pendekatan ini dipakai (supaya agent/developer berikutnya tidak mengulang bug yang sama).

**Definition of Done:**
- [ ] `DATABASE-CAKRA.md` tidak lagi punya policy dengan subquery self-referencing ke tabel yang sama
- [ ] Ada catatan singkat menjelaskan pola `get_user_role()` dan alasannya

---

### S2. `lib/types.ts` — Konsolidasi Type Definitions

**Masalah:** Tipe data seperti `Barang`, `Permintaan`, `RequestItem` didefinisikan inline berulang di beberapa file komponen (`ListPermintaan.tsx`, `TabelBarang.tsx`, dll). Risiko type drift kalau skema berubah.

**Solusi:** Generate types dari skema Supabase:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/types.ts
```

Lalu refactor komponen yang punya interface duplikat untuk import dari `lib/types.ts` alih-alih define ulang. Prioritaskan `ListPermintaan.tsx`, `TabelBarang.tsx`, dan file di `app/actions/*.ts`.

**Definition of Done:**
- [ ] `lib/types.ts` ada dan ter-generate dari skema live
- [ ] Minimal 3 komponen dengan interface duplikat sudah direfactor pakai types terpusat

---

### S3. `StatusBadge.tsx` — Komponen Reusable

**Masalah:** Badge status (Aman/Menipis, Menunggu/Disetujui/Ditolak) kemungkinan di-style manual berulang di banyak tempat.

**Solusi:** Buat `components/shared/StatusBadge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge'

type Status = 'aman' | 'menipis' | 'menunggu' | 'disetujui' | 'ditolak'

const STYLE_MAP: Record<Status, string> = {
  aman: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  disetujui: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  menipis: 'bg-amber-100 text-amber-800 border-amber-300',
  menunggu: 'bg-amber-100 text-amber-800 border-amber-300',
  ditolak: 'bg-red-100 text-red-800 border-red-300',
}

const LABEL_MAP: Record<Status, string> = {
  aman: 'Aman', menipis: 'Menipis', menunggu: 'Menunggu',
  disetujui: 'Disetujui', ditolak: 'Ditolak',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={STYLE_MAP[status]}>
      {LABEL_MAP[status]}
    </Badge>
  )
}
```

Ganti semua badge status manual di `ListPermintaan.tsx`, `TabelBarang.tsx`, `permintaan/[id]/page.tsx`, dll dengan komponen ini.

**Definition of Done:**
- [ ] `StatusBadge.tsx` dibuat dan dipakai di minimal semua halaman list & detail yang menampilkan status

---

### S4. Testing Dasar

**Masalah:** Tidak ada test sama sekali di repo — untuk logic sekritis trigger approval & pengurangan stok, ini berisiko.

**Solusi (bertahap, jangan langsung full coverage):**
1. Setup Vitest untuk unit test helper functions di `lib/utils.ts`
2. Test integrasi untuk `app/actions/permintaan.ts` (mock Supabase client) — minimal test skenario: approve dengan stok cukup, approve dengan stok tidak cukup (harus reject dengan pesan T1)
3. Kalau ada waktu lebih: pgTAP untuk test trigger `handle_approval()` langsung di level database

**Definition of Done:**
- [ ] Vitest terpasang, minimal 1 test file jalan
- [ ] Skenario approval (cukup & tidak cukup stok) punya test coverage

---

### S5. CI/CD Dasar

**Masalah:** Tidak ada `.github/workflows` — build/lint tidak otomatis dicek tiap push.

**Solusi:** Tambahkan `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` sebagai GitHub Secrets di repo settings.

**Definition of Done:**
- [ ] Setiap push/PR ke `main` otomatis lint + build, gagal kalau ada error

---

### S6. Pagination di Riwayat & Permintaan

**Masalah:** Halaman Riwayat dan Permintaan fetch semua data sekaligus tanpa limit — akan jadi berat setelah data bertambah banyak.

**Solusi:** Tambahkan pagination pakai Supabase `.range()`:

```ts
const PAGE_SIZE = 20
export async function listRiwayat(page: number = 0) {
  const supabase = await createClient()
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('riwayat_stok')
    .select('*, barang(nama)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  return { data, error, totalPages: count ? Math.ceil(count / PAGE_SIZE) : 0 }
}
```

Terapkan pola yang sama di `app/actions/riwayat.ts` dan `app/actions/permintaan.ts` (list), lalu tambahkan komponen pagination sederhana (Previous/Next atau nomor halaman) di halaman terkait.

**Definition of Done:**
- [ ] Riwayat & Permintaan list pakai `.range()`, tidak fetch semua row sekaligus
- [ ] Ada kontrol pagination di UI

---

## 🟢 IDE PENGEMBANGAN LANJUTAN (Backlog — di luar scope BRD saat ini)

Item di bawah ini butuh diskusi scope & effort lebih dulu sebelum dikerjakan — jangan langsung diimplementasi tanpa konfirmasi ke user.

### B1. Laporan Terjadwal Otomatis
Kirim laporan bulanan (barang keluar, stok menipis) otomatis via email ke pimpinan tiap awal bulan. Butuh: Supabase Edge Function + cron trigger (`pg_cron`), atau Vercel Cron Job yang panggil endpoint laporan lalu kirim via email service (Resend/SendGrid).

### B2. Barcode/QR Scan untuk Barang Fisik
Mempercepat pencatatan stok masuk/keluar fisik — scan barcode barang untuk auto-fill form permintaan atau update stok. Butuh library scanner (`html5-qrcode` atau native browser API) + field `barcode` baru di tabel `barang`.

### B3. Riwayat Stok Masuk (Pengadaan)
**Perlu dicek dulu:** saat ini kalau pengelola nambah stok manual lewat `TabelBarang.tsx` / `FormBarang`, apakah tercatat ke `riwayat_stok` dengan jenis `'masuk'`, atau cuma update kolom `stok` di tabel `barang` langsung tanpa jejak audit? Kalau yang kedua, ini gap audit trail yang perlu diperbaiki — setiap penambahan stok manual harus insert row baru ke `riwayat_stok` juga, supaya laporan "barang masuk" akurat.

### B4. Multi-Satuan Kerja (Multi-Satker)
Eksplisit di luar scope BRD saat ini (BRD-CAKRA.md bagian 3: "Di luar scope"). Kalau nanti mau dipakai Pengadilan Agama lain, perlu tambah kolom `satker_id` di hampir semua tabel + RLS filter berdasarkan satker user. Ini perubahan arsitektur besar — sebaiknya direncanakan sebagai fase terpisah dengan BRD/SRS baru, bukan ditempel ke skema yang sudah ada.

---

## Ringkasan Urutan Implementasi

| Urutan | Item | Kategori | Estimasi Effort |
|---|---|---|---|
| 1 | T1 — Validasi stok sebelum approval | Tinggi | 0.5-1 hari |
| 2 | T2 — Halaman kelola role user | Tinggi | 1 hari |
| 3 | S1 — Sinkronkan DATABASE-CAKRA.md | Sedang | 0.5 hari |
| 4 | S2 — lib/types.ts | Sedang | 0.5 hari |
| 5 | S3 — StatusBadge.tsx | Sedang | 0.5 hari |
| 6 | S6 — Pagination | Sedang | 0.5-1 hari |
| 7 | S5 — CI/CD dasar | Sedang | 0.5 hari |
| 8 | S4 — Testing dasar | Sedang | 1-2 hari |
| — | B1-B4 — Backlog | Ide lanjutan | Diskusi dulu sebelum estimasi |

**Total estimasi Prioritas Tinggi + Sedang: ±5-7 hari kerja.**
