# Software Requirements Specification (SRS)
## Aplikasi CAKRA (Catatan Kendali Persediaan)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini mendefinisikan kebutuhan fungsional dan non-fungsional secara teknis untuk pengembangan aplikasi CAKRA versi native web, sebagai acuan bagi tim pengembang (termasuk AI coding agent).

### 1.2 Tech Stack
- **Frontend:** Next.js (React, App Router), Tailwind CSS, shadcn/ui, Recharts
- **Backend/Database:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Hosting:** Vercel (frontend), Supabase Cloud (backend)
- **Laporan:** jsPDF / exceljs untuk export

### 1.3 Peran Pengguna (User Roles)

| Role | Kode | Akses |
|---|---|---|
| Pemohon | `pemohon` | Ajukan permintaan, lihat status permintaan sendiri |
| Pengelola | `pengelola` | Kelola data barang, lihat semua permintaan, verifikasi stok |
| Pimpinan | `pimpinan` | Approve/reject permintaan, lihat semua laporan |
| Admin | `admin` | Kelola user & role, akses penuh sistem |

---

## 2. Kebutuhan Fungsional

### FR-1: Autentikasi & Manajemen Akun
- FR-1.1: Sistem menyediakan login via email/password.
- FR-1.2: Sistem menyediakan login via Google OAuth.
- FR-1.3: User dapat melihat & mengubah profil (nama, unit kerja, foto).
- FR-1.4: User dapat mengubah password.
- FR-1.5: User dapat mengatur preferensi notifikasi.
- FR-1.6: User dapat logout.
- FR-1.7: Sistem membatasi akses fitur berdasarkan role (RLS).

### FR-2: Dashboard
- FR-2.1: Menampilkan jumlah permintaan hari ini.
- FR-2.2: Menampilkan jumlah permintaan menunggu persetujuan.
- FR-2.3: Menampilkan jumlah jenis barang dengan stok menipis.
- FR-2.4: Menampilkan jumlah transaksi bulan ini.
- FR-2.5: Menampilkan daftar barang dengan stok menipis (ringkas).
- FR-2.6: Menampilkan grafik transaksi 7 hari terakhir.
- FR-2.7: Dashboard menampilkan data berbeda sesuai role (pemohon hanya lihat data sendiri; pengelola/pimpinan lihat semua).

### FR-3: Permintaan Barang
- FR-3.1: Pemohon dapat membuat permintaan baru dengan minimal 1 item barang.
- FR-3.2: Form permintaan mencakup: unit kerja, nama barang, jumlah, keperluan, catatan.
- FR-3.3: Sistem generate nomor permintaan otomatis (format: PRM-XXXX).
- FR-3.4: Permintaan memiliki status: Menunggu, Disetujui, Ditolak.
- FR-3.5: User dapat memfilter daftar permintaan berdasarkan status (tab: Semua, Menunggu, Disetujui, Ditolak).
- FR-3.6: User dapat melihat detail permintaan (tanggal, pemohon, unit kerja, barang, jumlah, keperluan, catatan).
- FR-3.7: Pemohon hanya bisa melihat & membuat permintaan miliknya sendiri.
- FR-3.8: Pengelola/Pimpinan/Admin dapat membuat permintaan atas nama pegawai lain (input manual) lewat halaman khusus, baik memilih pemohon yang sudah terdaftar maupun input pemohon baru (nama + email) yang belum pernah login. Jika pemohon baru kemudian login via Google, riwayat permintaannya otomatis terhubung ke akunnya.

### FR-4: Persetujuan (Approval)
- FR-4.1: Pengelola/Pimpinan dapat menyetujui atau menolak permintaan dari halaman detail.
- FR-4.2: Saat disetujui, sistem otomatis mengurangi stok barang terkait.
- FR-4.3: Saat disetujui, sistem mencatat log ke riwayat stok.
- FR-4.4: Sistem mencatat siapa yang menyetujui/menolak dan kapan.
- FR-4.5: Sistem mengirim notifikasi ke pemohon saat status berubah.
- FR-4.6: Jika stok tidak mencukupi, sistem menampilkan peringatan sebelum approval disetujui.

### FR-5: Data Persediaan
- FR-5.1: Pengelola dapat menambah barang baru (nama, kategori, satuan, stok awal, stok minimum, lokasi).
- FR-5.2: Pengelola dapat mengedit data barang.
- FR-5.3: Sistem menampilkan status barang otomatis: "Aman" jika stok > stok minimum, "Menipis" jika stok <= stok minimum.
- FR-5.4: User dapat mencari/filter barang berdasarkan nama atau status.
- FR-5.5: User dapat melihat detail stok barang (stok tersedia, stok minimum, satuan, lokasi, riwayat penggunaan).

### FR-6: Riwayat Barang Keluar
- FR-6.1: Sistem menampilkan seluruh transaksi barang keluar yang telah disetujui.
- FR-6.2: User dapat mencari/filter riwayat berdasarkan nama pemohon atau barang.

### FR-7: Laporan
- FR-7.1: User dapat memilih jenis laporan: Laporan Barang Keluar, Laporan Stok, Laporan Stok Menipis.
- FR-7.2: User dapat memilih periode laporan (bulan/tahun).
- FR-7.3: Sistem dapat generate & mengunduh laporan dalam format PDF/Excel.

### FR-8: Notifikasi
- FR-8.1: Sistem mengirim notifikasi real-time untuk: permintaan baru (ke pengelola/pimpinan), status disetujui/ditolak (ke pemohon), stok menipis (ke pengelola).
- FR-8.2: User dapat melihat daftar seluruh notifikasi.
- FR-8.3: Notifikasi menampilkan waktu relatif (mis. "1 menit yang lalu").
- FR-8.4: User dapat menandai notifikasi sebagai sudah dibaca.

---

## 3. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| Performance | Halaman dashboard harus load < 2 detik pada koneksi normal |
| Security | Password ter-hash, RLS aktif di seluruh tabel, HTTPS wajib |
| Usability | Responsive di mobile & desktop, mengikuti desain mockup yang ada |
| Reliability | Data tersimpan di cloud (Supabase) dengan backup otomatis |
| Scalability | Skema database mendukung penambahan kategori/barang tanpa migrasi besar |
| Maintainability | Kode terstruktur modular (folder per fitur), mudah dikembangkan agent AI lain |
| Availability | Uptime mengikuti SLA Supabase & Vercel (~99.9%) |

## 4. Use Case Ringkas

| Use Case | Aktor |
|---|---|
| Login/Register | Semua role |
| Ajukan Permintaan Barang | Pemohon |
| Lihat Status Permintaan | Pemohon |
| Setujui/Tolak Permintaan | Pengelola, Pimpinan |
| Kelola Data Barang | Pengelola |
| Lihat Dashboard | Semua role (data sesuai akses) |
| Generate Laporan | Pengelola, Pimpinan |
| Kelola Profil | Semua role |

## 5. Struktur Halaman (Sesuai Mockup)

1. Login
2. Dashboard
3. Permintaan Masuk (list + detail + approval)
4. Data Persediaan (list + tambah barang)
5. Detail Stok
6. Riwayat Barang Keluar
7. Laporan
8. Notifikasi
9. Akun Saya

## 6. Referensi
- Lihat `DATABASE-CAKRA.md` untuk skema database lengkap.
- Lihat `AGENTS.md` untuk konvensi coding & struktur folder yang harus diikuti agent.
