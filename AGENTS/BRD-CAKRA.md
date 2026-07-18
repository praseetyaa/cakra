# Business Requirements Document (BRD)
## Aplikasi CAKRA (Catatan Kendali Persediaan)
### Pengadilan Agama Kajen

---

## 1. Latar Belakang

Pengadilan Agama Kajen saat ini mengelola pencatatan persediaan barang (ATK, consumables) secara manual, yang berpotensi menimbulkan:
- Ketidakakuratan data stok
- Proses permintaan barang yang lambat (tidak ada tracking status)
- Sulitnya monitoring stok menipis secara real-time
- Tidak adanya jejak audit (siapa meminta, siapa menyetujui, kapan)

Sebelumnya dikembangkan prototipe menggunakan Google Form + Google Sheet + AppSheet. Untuk kebutuhan jangka panjang yang lebih fleksibel, powerful, dan scalable, aplikasi akan dibangun ulang sebagai **aplikasi web native**.

## 2. Tujuan Bisnis

1. Digitalisasi penuh proses permintaan dan persetujuan barang keluar.
2. Memberikan visibilitas real-time atas kondisi stok persediaan.
3. Menyediakan jejak audit yang lengkap dan akuntabel.
4. Mengurangi waktu proses permintaan barang dari pengajuan hingga persetujuan.
5. Menyediakan laporan yang bisa diunduh untuk kebutuhan pelaporan internal/eksternal.

## 3. Ruang Lingkup (Scope)

### Termasuk dalam scope:
- Autentikasi pengguna (email/password + Google login)
- Manajemen data master persediaan barang
- Pengajuan permintaan barang oleh pegawai (pemohon)
- Proses persetujuan/penolakan oleh pengelola/pimpinan
- Dashboard monitoring (stok, transaksi, grafik)
- Notifikasi real-time
- Laporan (barang keluar, stok, stok menipis) yang bisa diunduh

### Di luar scope (fase awal):
- Integrasi dengan sistem keuangan/anggaran
- Manajemen pengadaan/pembelian barang (procurement)
- Aplikasi mobile native (akan menggunakan PWA)
- Multi-satuan kerja / multi-cabang (hanya untuk 1 instansi: PA Kajen)

## 4. Stakeholder

| Peran | Deskripsi | Kepentingan |
|---|---|---|
| Pemohon (Pegawai) | Mengajukan permintaan barang | Proses cepat, status jelas |
| Pengelola Persediaan | Mengelola stok, memverifikasi & menindaklanjuti permintaan | Data akurat, workflow efisien |
| Pimpinan | Menyetujui/menolak permintaan | Kontrol & visibilitas pengeluaran barang |
| Admin/IT | Mengelola sistem, user, akses | Sistem stabil & aman |

## 5. Proses Bisnis (As-Is vs To-Be)

**As-Is (Manual/Google Form):**
Pegawai isi form manual → data masuk spreadsheet → pengelola cek manual → approval manual/lisan → catat pengeluaran manual.

**To-Be (Aplikasi CAKRA):**
Pegawai login & ajukan permintaan → sistem kirim notifikasi ke pengelola/pimpinan → approval dilakukan di aplikasi → stok otomatis terpotong saat disetujui → notifikasi stok menipis otomatis → laporan bisa diunduh kapan saja.

## 6. Kebutuhan Fungsional Tingkat Tinggi

1. Sistem harus bisa mengelola data barang (tambah, edit, lihat stok).
2. Sistem harus bisa menangani pengajuan permintaan barang dengan multi-item.
3. Sistem harus mendukung alur persetujuan (approve/reject) dengan pencatatan siapa & kapan.
4. Sistem harus otomatis mengurangi stok saat permintaan disetujui.
5. Sistem harus mengirim notifikasi otomatis untuk: permintaan baru, hasil approval, stok menipis.
6. Sistem harus menyediakan dashboard ringkasan (jumlah permintaan, stok menipis, transaksi bulanan, grafik).
7. Sistem harus bisa menghasilkan laporan (barang keluar, stok, stok menipis) dalam format terunduh.

## 7. Batasan (Constraints)

- Anggaran pengembangan minim → prioritaskan tools open-source/gratis (Supabase free tier, Vercel free tier).
- Tim pengembang kecil → prioritaskan stack yang cepat untuk di-build (Next.js + Supabase).
- Harus tetap bisa diakses via mobile browser (responsive/PWA), tanpa perlu publish ke Play Store/App Store.

## 8. Kriteria Sukses

- Waktu proses permintaan barang (ajukan → disetujui) berkurang dibanding proses manual.
- Tidak ada lagi selisih stok fisik vs data karena human error pencatatan.
- Pengelola mendapat notifikasi stok menipis sebelum barang benar-benar habis.
- Laporan bulanan bisa dihasilkan dalam hitungan detik, bukan disusun manual.

## 9. Asumsi

- Seluruh pegawai memiliki akun Google/email yang bisa digunakan untuk login.
- Koneksi internet tersedia di lingkungan kantor.
- Satu pengelola persediaan bertanggung jawab atas seluruh data master barang.
