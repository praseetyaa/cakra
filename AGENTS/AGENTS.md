# AGENTS.md — Panduan untuk AI Coding Agent
## Project: CAKRA (Catatan Kendali Persediaan) — Pengadilan Agama Kajen

Dokumen ini adalah instruksi konteks untuk AI coding agent (Antigravity/Claude/dsb) yang bekerja di project ini. Baca dokumen ini terlebih dahulu sebelum menulis kode apa pun. Rujuk juga `BRD-CAKRA.md`, `SRS-CAKRA.md`, dan `DATABASE-CAKRA.md` untuk detail requirement & skema data.

---

## 1. Ringkasan Project

CAKRA adalah aplikasi web untuk mengelola permintaan dan persediaan barang kantor (ATK) di Pengadilan Agama Kajen. Alur utama: pegawai mengajukan permintaan barang → pengelola/pimpinan menyetujui/menolak → stok otomatis terpotong → notifikasi terkirim → laporan bisa diunduh.

## 2. Tech Stack (WAJIB, jangan diganti tanpa konfirmasi)

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Charts:** Recharts
- **Backend/DB/Auth/Realtime:** Supabase
- **Export laporan:** jsPDF (PDF) dan exceljs atau SheetJS (Excel)
- **Hosting:** Vercel

Jangan menambahkan library alternatif (mis. Firebase, Redux, styled-components) kecuali diminta eksplisit.

## 3. Struktur Folder yang Harus Diikuti

```
/app
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /dashboard/page.tsx
    /permintaan/page.tsx
    /permintaan/[id]/page.tsx
    /persediaan/page.tsx
    /persediaan/[id]/page.tsx
    /riwayat/page.tsx
    /laporan/page.tsx
    /notifikasi/page.tsx
    /pengguna/page.tsx   <- manajemen role user (khusus admin)
    /akun/page.tsx
    layout.tsx        <- shared sidebar/bottom-nav
/components
  /ui                <- shadcn components (jangan edit manual, generate via CLI)
  /dashboard         <- StatCard, GrafikTransaksi, dll
  /permintaan        <- FormPermintaan, ListPermintaan, DetailPermintaan
  /persediaan        <- TabelBarang, FormBarang, DetailStok
  /pengguna          <- TabelPengguna
  /shared            <- Navbar, Sidebar, BottomNav, StatusBadge
/lib
  /supabase
    client.ts        <- browser client
    server.ts        <- server client (untuk Server Components/Actions)
  /types.ts          <- TypeScript types hasil generate dari skema Supabase
  /utils.ts
/app/actions         <- Server Actions (permintaan, auth, pengguna, dll)
```

## 4. Konvensi Coding

- Gunakan **TypeScript** di seluruh file, bukan JavaScript biasa.
- Gunakan **Server Components** untuk fetch data (list permintaan, dashboard, dsb), dan **Server Actions** untuk mutasi (insert permintaan, approve/reject).
- Gunakan **Client Components** (`"use client"`) hanya untuk bagian interaktif: form, modal, filter, realtime listener.
- Nama file komponen: PascalCase (`FormPermintaan.tsx`). Nama route folder: lowercase kebab-case.
- Semua warna, spacing ikuti default Tailwind — jangan hardcode hex color kecuali menyesuaikan identitas hijau tua di mockup (`emerald-800`/`green-900` sebagai warna utama, mendekati branding CAKRA/Pengadilan Agama).
- Gunakan komponen shadcn/ui yang sudah ada (Button, Card, Badge, Table, Dialog, Input, Tabs) — jangan bikin komponen custom kalau shadcn sudah punya.
- Validasi form pakai `zod` + `react-hook-form`.

## 5. Aturan Bisnis Krusial (Jangan Dilanggar)

1. **Approval mengubah stok otomatis** — logic ini HARUS di trigger database (`handle_approval()` di `DATABASE-CAKRA.md`), BUKAN di frontend/API layer. Frontend hanya update kolom `status` di tabel `permintaan`.
2. **Role-based access** ditegakkan oleh RLS Supabase, tapi frontend tetap harus sembunyikan/nonaktifkan UI yang tidak relevan sesuai role (defense in depth).
3. **Nomor permintaan** (`PRM-XXXX`) di-generate otomatis oleh database trigger, jangan digenerate di frontend.
4. **Status barang** ("Aman"/"Menipis") adalah generated column di database — jangan hitung ulang di frontend, cukup baca dari kolom `status`.
5. Setiap approval/reject WAJIB mengisi `disetujui_oleh` dan `tanggal_keputusan` — sudah ditangani trigger, jangan dobel-set dari frontend.

## 6. Urutan Pengembangan (Ikuti Urutan Ini)

Jangan lompat ke fitur berikutnya sebelum fitur sebelumnya bisa berjalan & ditest manual.

1. Setup Next.js + Tailwind + shadcn/ui + koneksi Supabase client
2. Autentikasi (login email/password + Google OAuth) + halaman register + proteksi route via middleware
3. Layout dashboard (sidebar/bottom-nav sesuai 5 menu: Dashboard, Permintaan, Persediaan, Laporan, Akun)
4. Modul Persediaan: list barang, tambah barang, detail stok
5. Modul Permintaan: form ajukan permintaan (multi-item), list dengan tab status, detail permintaan
6. Modul Approval: tombol setujui/tolak di halaman detail (khusus role pengelola/pimpinan)
7. Dashboard: stat card + grafik transaksi 7 hari
8. Riwayat Barang Keluar
9. Notifikasi real-time (pakai Supabase Realtime channel)
10. Laporan (pilih jenis + periode + unduh PDF/Excel)
11. Halaman Akun (profil, ubah password, pengaturan notifikasi, logout)

## 7. Definition of Done per Modul

Sebelum lanjut ke modul berikutnya, pastikan:
- [ ] Fitur berfungsi end-to-end (bukan cuma UI kosong)
- [ ] RLS sudah diverifikasi tidak bocor data antar role
- [ ] Sudah dites manual dengan minimal 2 role berbeda (pemohon vs pengelola)
- [ ] Tidak ada error di console browser maupun terminal

## 8. Yang TIDAK Boleh Dilakukan Agent

- Jangan mengganti stack tanpa konfirmasi ke user.
- Jangan membuat logic approval/pengurangan stok di client-side/API route — harus di database trigger.
- Jangan hardcode kredensial Supabase di kode — selalu pakai environment variables (`.env.local`).
- Jangan skip RLS "untuk sementara demi cepat" — keamanan data harus dari awal.
- Jangan generate ulang seluruh project dari nol kalau hanya diminta menambah 1 fitur kecil.

## 9. Environment Variables yang Dibutuhkan

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 10. Referensi Desain

Ikuti struktur & label UI persis seperti pada mockup "ILUSTRASI TAMPILAN APLIKASI CAKRA" yang sudah dibuat sebelumnya:
- Warna utama hijau tua (dark green) untuk header/sidebar/tombol utama
- Badge status: hijau (Aman/Disetujui), kuning (Menunggu/Menipis), merah (Ditolak)
- Bottom navigation di mobile: Dashboard, Permintaan, Persediaan, Laporan, Akun
