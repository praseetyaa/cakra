# Panduan & Skrip Integrasi Google Form ➔ Aplikasi CAKRA

Dokumen ini berisi kode **Google Apps Script** dan skrip SQL RLS Supabase untuk menghubungkan Google Form / Google Sheet ke sistem CAKRA.

---

## ⚠️ 2 Syarat Penting Agar Data Masuk Ke Website:

### 1. Masukkan Skrip SQL RLS di Supabase (Satu Kali Saja)
Karena data dikirim otomatis oleh server Google (tanpa login web), jalankan skrip berikut di **Supabase SQL Editor**:

```sql
-- Berikan izin insert untuk permintaan dari Google Form
drop policy if exists "permintaan_insert_form" on public.permintaan;
create policy "permintaan_insert_form" on public.permintaan
  for insert with check (sumber = 'form');

drop policy if exists "permintaan_detail_insert_form" on public.permintaan_detail;
create policy "permintaan_detail_insert_form" on public.permintaan_detail
  for insert with check (true);
```

### 2. URL Webhook Harus Bisa Diakses dari Internet (Bukan `localhost`)
Google Apps Script berjalan di server cloud Google. Server Google **tidak dapat mengakses `localhost:3000`** di komputer lokal Anda.
* **Jika Aplikasi Sudah Online (Vercel / Hosting / Domain)**:
  Gunakan URL domain asli Anda, misal: `https://cakra.pa-kajen.go.id/api/webhooks/google-form`
* **Jika Masih Pengujian di Computer Lokal (Dev Mode)**:
  Gunakan **ngrok** / **localtunnel** untuk membuat URL publik sementara:
  Jalankan perintah ini di terminal: `npx ngrok http 3000` (atau `npx localtunnel --port 3000`), lalu gunakan URL publik yang dihasilkan (misal `https://xyz.ngrok-free.app/api/webhooks/google-form`).

---

## 📜 Kode Google Apps Script (`Code.gs`)
*(Sudah disesuaikan dengan struktur kolom Google Sheet Anda: B=Nama, C=Email, D=Unit Kerja, E=Keperluan, F=Nama Barang, H=Jumlah, I=Catatan)*

```javascript
/**
 * SKRIP INTEGRASI GOOGLE SHEET / FORM -> APLIKASI CAKRA
 */

// GANTI DENGAN URL PUBLIK / DOMAIN CAKRA ANDA
const CAKRA_WEBHOOK_URL = "https://domain-cakra-anda.com/api/webhooks/google-form";
const WEBHOOK_SECRET = "cakra-google-form-secret";

function onFormSubmit(e) {
  try {
    let email = "";
    let nama = "";
    let unitKerja = "";
    let keperluan = "";
    let catatan = "";
    let items = [];

    // JIKA DIPANGGIL DARI GOOGLE SHEET RESPON FORM
    if (e && e.values) {
      // Pembacaan Kolom Spreadsheet:
      // e.values[0] = Timestamp (A)
      // e.values[1] = Nama Pemohon (B)
      // e.values[2] = Email Pemohon (C)
      // e.values[3] = Unit Kerja (D)
      // e.values[4] = Keperluan (E)
      // e.values[5] = Nama Barang / Deskripsi (F)
      // e.values[6] = Kode Barang (G)
      // e.values[7] = Jumlah (H)
      // e.values[8] = Catatan (I)

      nama = e.values[1] || "";
      email = e.values[2] || "";
      unitKerja = e.values[3] || "";
      keperluan = e.values[4] || "";
      
      const namaBarang = e.values[5] || "";
      const jumlahBarang = parseInt(e.values[7] || "1", 10);
      catatan = e.values[8] || "Diisi via Google Form";

      if (namaBarang) {
        items.push({
          nama_barang: namaBarang,
          jumlah: isNaN(jumlahBarang) ? 1 : jumlahBarang
        });
      }
    } 
    // JIKA DIPANGGIL DARI GOOGLE FORM DIRECT
    else if (e && e.response) {
      email = e.response.getRespondentEmail() || "";
      const itemResponses = e.response.getItemResponses();

      for (let i = 0; i < itemResponses.length; i++) {
        const itemResponse = itemResponses[i];
        const title = itemResponse.getItem().getTitle().toLowerCase();
        const response = itemResponse.getResponse();

        if (title.includes("email")) {
          email = email || String(response);
        } else if (title.includes("nama pemohon") || title.includes("nama")) {
          nama = String(response);
        } else if (title.includes("unit") || title.includes("kerja")) {
          unitKerja = String(response);
        } else if (title.includes("keperluan")) {
          keperluan = String(response);
        } else if (title.includes("catatan")) {
          catatan = String(response);
        } else if (title.includes("barang") || title.includes("deskripsi")) {
          items.push({ nama_barang: String(response), jumlah: 1 });
        }
      }
    }

    if (!email) email = "pegawai.form@pa-kajen.go.id";
    if (!unitKerja) unitKerja = "Kepaniteraan";
    if (!keperluan) keperluan = "Permintaan Barang Logistik Form";

    const payload = {
      secret: WEBHOOK_SECRET,
      email: email,
      nama: nama,
      unit_kerja: unitKerja,
      keperluan: keperluan,
      catatan: catatan,
      items: items
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-webhook-secret": WEBHOOK_SECRET
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(CAKRA_WEBHOOK_URL, options);
    Logger.log("CAKRA Webhook Response: " + response.getContentText());

  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  }
}
```
