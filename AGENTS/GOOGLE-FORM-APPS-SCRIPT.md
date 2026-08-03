# Panduan & Skrip Integrasi Google Form ➔ Aplikasi CAKRA

Dokumen ini berisi kode **Google Apps Script** dan skrip SQL RLS Supabase untuk menghubungkan Google Form / Google Sheet ke sistem CAKRA.

---

## ⚠️ 2 Syarat Penting Agar Data Masuk Ke Website:

### 1. Masukkan Skrip SQL RLS di Supabase (Satu Kali Saja)
Karena data dikirim otomatis oleh server Google (tanpa login web), jalankan skrip berikut di **Supabase SQL Editor**:

```sql
-- Berikan izin insert & select untuk permintaan dari Google Form
drop policy if exists "permintaan_insert_form" on public.permintaan;
create policy "permintaan_insert_form" on public.permintaan
  for insert with check (sumber = 'form');

drop policy if exists "permintaan_detail_insert_form" on public.permintaan_detail;
create policy "permintaan_detail_insert_form" on public.permintaan_detail
  for insert with check (true);

-- Izin SELECT agar detail barang dari Google Form bisa dibaca di Web UI
drop policy if exists "permintaan_detail_select_form" on public.permintaan_detail;
create policy "permintaan_detail_select_form" on public.permintaan_detail
  for select using (true);

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

    // 1. JIKA DIPANGGIL DARI GOOGLE SHEET (e.namedValues - SUPPORT MULTI-ITEM)
    if (e && e.namedValues) {
      let currentBarang = "";

      for (let key in e.namedValues) {
        const valArr = e.namedValues[key];
        const val = Array.isArray(valArr) && valArr.length > 0 ? String(valArr[0]).trim() : String(valArr || "").trim();
        const lowerKey = key.toLowerCase().trim();

        if (lowerKey.includes("email")) {
          email = val;
        } else if (lowerKey.includes("barang") || lowerKey.includes("deskripsi")) {
          if (currentBarang && val) {
            items.push({ nama_barang: currentBarang, jumlah: 1 });
          }
          currentBarang = val;
        } else if (lowerKey.includes("jumlah") || lowerKey.includes("qty")) {
          const parsed = parseInt(val, 10);
          const validQty = isNaN(parsed) || parsed <= 0 ? 1 : parsed;
          if (currentBarang) {
            items.push({ nama_barang: currentBarang, jumlah: validQty });
            currentBarang = "";
          }
        } else if (lowerKey.includes("nama pemohon") || (lowerKey.includes("nama") && !lowerKey.includes("barang"))) {
          nama = val;
        } else if (lowerKey.includes("unit") || lowerKey.includes("kerja")) {
          unitKerja = val;
        } else if (lowerKey.includes("keperluan")) {
          keperluan = val;
        } else if (lowerKey.includes("catatan")) {
          catatan = val;
        }
      }

      if (currentBarang) {
        items.push({ nama_barang: currentBarang, jumlah: 1 });
      }
    }
    // 2. JIKA DIPANGGIL DARI GOOGLE FORM DIRECT (e.response - SUPPORT MULTI-ITEM)
    else if (e && e.response) {
      email = e.response.getRespondentEmail() || "";
      const itemResponses = e.response.getItemResponses();

      let currentBarang = "";

      for (let i = 0; i < itemResponses.length; i++) {
        const itemResponse = itemResponses[i];
        const title = itemResponse.getItem().getTitle().toLowerCase().trim();
        const response = itemResponse.getResponse();

        if (title.includes("email")) {
          email = email || String(response);
        } else if (title.includes("barang") || title.includes("deskripsi")) {
          if (currentBarang) {
            items.push({ nama_barang: currentBarang, jumlah: 1 });
          }
          currentBarang = String(response);
        } else if (title.includes("jumlah") || title.includes("qty")) {
          const qtyParsed = parseInt(String(response), 10);
          const validQty = isNaN(qtyParsed) || qtyParsed <= 0 ? 1 : qtyParsed;
          if (currentBarang) {
            items.push({ nama_barang: currentBarang, jumlah: validQty });
            currentBarang = "";
          }
        } else if (title.includes("nama pemohon") || (title.includes("nama") && !title.includes("barang"))) {
          nama = String(response);
        } else if (title.includes("unit") || title.includes("kerja")) {
          unitKerja = String(response);
        } else if (title.includes("keperluan")) {
          keperluan = String(response);
        } else if (title.includes("catatan")) {
          catatan = String(response);
        }
      }

      if (currentBarang) {
        items.push({ nama_barang: currentBarang, jumlah: 1 });
      }
    }
    // 3. FALLBACK: ARRAY e.values
    else if (e && e.values) {
      nama = e.values[1] || "";
      email = e.values[2] || "";
      unitKerja = e.values[3] || "";
      keperluan = e.values[4] || "";
      
      const namaBarang = e.values[5] || e.values[6] || "";
      const jumlahBarang = parseInt(e.values[7] || e.values[6] || "1", 10);
      catatan = e.values[8] || e.values[5] || "Diisi via Google Form";

      if (namaBarang) {
        items.push({
          nama_barang: namaBarang,
          jumlah: isNaN(jumlahBarang) ? 1 : jumlahBarang
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

