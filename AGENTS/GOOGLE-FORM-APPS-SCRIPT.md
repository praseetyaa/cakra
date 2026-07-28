# Panduan & Skrip Integrasi Google Form ➔ Aplikasi CAKRA

Dokumen ini berisi kode **Google Apps Script** dan langkah-langkah mudah untuk menghubungkan Google Form / Google Sheet ke sistem CAKRA.

 Setibanya responden mengisi Google Form, data permintaan akan langsung dikirim detik itu juga ke CAKRA dengan status `Menunggu` dan label `Google Form`.

---

## 🛠️ Langkah-Langkah Pemasangan (2 Menit)

1. Buka **Google Form** atau **Google Sheet** (tempat respon Google Form disimpan).
2. Di menu bagian atas, klik **Extensions** (Ekstensi) ➔ **Apps Script**.
3. Hapus semua kode default yang ada di dalam editor Apps Script.
4. Salin (*copy*) seluruh kode **Google Apps Script** di bawah ini, lalu tempel (*paste*) ke editor Apps Script.
5. Sesuaikan variabel `CAKRA_WEBHOOK_URL` dengan domain aplikasi CAKRA Anda (misal `https://cakra.pa-kajen.go.id/api/webhooks/google-form` atau URL ngrok/staging Anda).
6. Klik ikon 💾 **Save** (Simpan Project).
7. Di menu sebelah kiri Apps Script, klik ikon ⏰ **Triggers** (Pemicu) ➔ Klik **+ Add Trigger** (Tambah Pemicu) di kanan bawah:
   - Choose which function to run: **`onFormSubmit`**
   - Select event source: **`From form`** (atau `From spreadsheet`)
   - Select event type: **`On form submit`**
   - Klik **Save** (izinkan akses akun Google jika diminta).

Selesai! Sekarang setiap kali ada jawaban baru di Google Form, data akan otomatis masuk ke aplikasi CAKRA.

---

## 📜 Kode Google Apps Script (`Code.gs`)

```javascript
/**
 * SKRIP INTEGRASI GOOGLE FORM -> APLIKASI CAKRA PA KAJEN
 * Dipicu otomatis setiap ada pengisian Google Form baru (onFormSubmit)
 */

// 1. SESUAIKAN URL WEBHOOK CAKRA ANDA DI SINI
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

    // --- CARA A: JIKA DIPASANG DI GOOGLE FORM DIRECT ---
    if (e && e.response) {
      email = e.response.getRespondentEmail();
      const itemResponses = e.response.getItemResponses();

      for (let i = 0; i < itemResponses.length; i++) {
        const itemResponse = itemResponses[i];
        const title = itemResponse.getItem().getTitle().toLowerCase();
        const response = itemResponse.getResponse();

        if (title.includes("email")) {
          email = email || String(response);
        } else if (title.includes("nama")) {
          nama = String(response);
        } else if (title.includes("unit") || title.includes("ruangan") || title.includes("jabatan")) {
          unitKerja = String(response);
        } else if (title.includes("keperluan") || title.includes("tujuan")) {
          keperluan = String(response);
        } else if (title.includes("catatan") || title.includes("keterangan")) {
          catatan = String(response);
        } else if (title.includes("barang") || title.includes("atk") || title.includes("item")) {
          // Tangkap nama barang & jumlah jika dalam bentuk teks atau checklist
          if (Array.isArray(response)) {
            response.forEach(function(val) {
              items.push({ nama_barang: String(val), jumlah: 1 });
            });
          } else if (typeof response === "string") {
            // Contoh baris: "BALLPOINT CLICK: 2, Kertas A4: 1" atau list biasa
            items.push({ nama_barang: String(response), jumlah: 1 });
          }
        }
      }
    } 
    // --- CARA B: JIKA DIPASANG DI GOOGLE SHEET RESPON ---
    else if (e && e.values) {
      // Nilai kolom baris baru spreadsheet [Timestamp, Email, Nama, Unit, Keperluan, Barang, ...]
      email = e.values[1] || "";
      nama = e.values[2] || "";
      unitKerja = e.values[3] || "";
      keperluan = e.values[4] || "";
      catatan = e.values[6] || "Form Response";
      
      const barangInput = e.values[5] || "";
      items.push({ nama_barang: barangInput, jumlah: 1 });
    }

    // Fallback default nilai jika kosong
    if (!email) email = "pegawai.form@pa-kajen.go.id";
    if (!unitKerja) unitKerja = "Umum";
    if (!keperluan) keperluan = "Permintaan Barang Logistik Form";
    if (items.length === 0) {
      items.push({ nama_barang: "ATK Umum", jumlah: 1 });
    }

    // 2. SUSUN PAYLOAD JSON UNTUK CAKRA
    const payload = {
      secret: WEBHOOK_SECRET,
      email: email,
      nama: nama,
      unit_kerja: unitKerja,
      keperluan: keperluan,
      catatan: catatan,
      items: items
    };

    // 3. KIRIM VIA HTTP POST KE WEBHOOK CAKRA
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
