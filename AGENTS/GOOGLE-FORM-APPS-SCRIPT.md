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

-- Berikan izin select public/anon untuk membaca daftar barang
drop policy if exists "barang_select_public" on public.barang;
create policy "barang_select_public" on public.barang
  for select using (true);
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
const CAKRA_WEBHOOK_URL = "https://cakra.spandiv.xyz/api/webhooks/google-form";
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

      let tempNamaBarang = "";
      let tempJumlah = 1;

      for (let i = 0; i < itemResponses.length; i++) {
        const itemResponse = itemResponses[i];
        const title = itemResponse.getItem().getTitle().toLowerCase().trim();
        const response = itemResponse.getResponse();

        if (title.includes("barang") || title.includes("deskripsi")) {
          tempNamaBarang = String(response);
        } else if (title.includes("jumlah") || title.includes("qty")) {
          const qtyParsed = parseInt(String(response), 10);
          tempJumlah = isNaN(qtyParsed) || qtyParsed <= 0 ? 1 : qtyParsed;
        } else if (title.includes("pemohon") || (title.includes("nama") && !title.includes("barang"))) {
          nama = String(response);
        } else if (title.includes("email")) {
          email = email || String(response);
        } else if (title.includes("unit") || title.includes("kerja")) {
          unitKerja = String(response);
        } else if (title.includes("keperluan")) {
          keperluan = String(response);
        } else if (title.includes("catatan")) {
          catatan = String(response);
        }
      }

      if (tempNamaBarang) {
        items.push({
          nama_barang: tempNamaBarang,
          jumlah: tempJumlah
        });
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

/**
 * 🔄 FITUR SINKRONISASI DROPDOWN / CHOICE BARANG GOOGLE FORM
 * 
 * Fungsi ini mengambil daftar barang aktif dari API CAKRA dan memperbarui 
 * pilihan barang pada Google Form secara otomatis.
 * 
 * CARA MENGGUNAKAN:
 * 1. Buka Google Form Anda -> Klik Titik Tiga (More) -> Script editor.
 * 2. Masukkan ID Google Form Anda pada variabel GOOGLE_FORM_ID di bawah.
 * 3. Ganti NAMA_PERTANYAAN_BARANG sesuai nama judul soal di Google Form (misal: "Nama Barang" / "Pilih Barang").
 * 4. Buat Trigger di Apps Script (Clock icon / Triggers) -> Add Trigger -> Run: syncFormChoices -> Time-driven (misal: Every 15 minutes / Every hour).
 */
const CAKRA_SYNC_URL = "https://cakra.spandiv.xyz/api/webhooks/google-form/sync";
const WEBHOOK_SECRET = "cakra-google-form-secret";
const GOOGLE_FORM_ID = "1Hw6Lda43O5TrluLM8-iByFnd7wUbqZfYmJ1-fHLMw-M";
const NAMA_PERTANYAAN_BARANG = "Nama Barang"; // Judul pertanyaan dropdown/list barang di Google Form

function syncFormChoices() {
  try {
    const url = CAKRA_SYNC_URL + "?secret=" + encodeURIComponent(WEBHOOK_SECRET);
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "x-webhook-secret": WEBHOOK_SECRET
      },
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      Logger.log("HTTP Error " + statusCode + " saat memanggil API: " + response.getContentText());
      return;
    }

    const json = JSON.parse(response.getContentText());

    if (!json.success || !json.items || json.items.length === 0) {
      Logger.log("Gagal atau daftar barang kosong: " + response.getContentText());
      return;
    }

    // Opsi format pilihan dropdown yang bisa Anda gunakan:
    // - json.choices_names_only  => "Kertas A4"
    // - json.choices_with_code   => "[BRG-001] Kertas A4" (ADA KODE BARANG)
    // - json.choices_with_stock  => "Kertas A4 (Stok: 10 Pcs)"
    // - json.choices_full        => "[BRG-001] Kertas A4 (Stok: 10 Pcs)" (KODE + NAMA + STOK)
    const itemChoices = json.choices_full || json.choices_with_code || json.choices_names_only;

    const form = FormApp.openById(GOOGLE_FORM_ID);
    const items = form.getItems();
    let updated = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.getTitle().trim().toLowerCase();

      if (title === NAMA_PERTANYAAN_BARANG.trim().toLowerCase()) {
        if (item.getType() === FormApp.ItemType.LIST) {
          item.asListItem().setChoiceValues(itemChoices);
          updated = true;
        } else if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
          item.asMultipleChoiceItem().setChoiceValues(itemChoices);
          updated = true;
        } else if (item.getType() === FormApp.ItemType.CHECKBOX) {
          item.asCheckboxItem().setChoiceValues(itemChoices);
          updated = true;
        }
      }
    }

    if (updated) {
      Logger.log("Berhasil memperbarui pilihan barang di Google Form (" + itemChoices.length + " barang)");
    } else {
      Logger.log("Pertanyaan dengan judul '" + NAMA_PERTANYAAN_BARANG + "' tidak ditemukan di Google Form.");
    }
  } catch (err) {
    Logger.log("Error in syncFormChoices: " + err.toString());
  }
}
```

