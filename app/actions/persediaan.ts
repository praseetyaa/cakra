'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBarang(prevState: unknown, formData: FormData) {
  const kd_brng = (formData.get('kd_brng') as string || '').trim() || null
  const kd_barang = (formData.get('kd_barang') as string || '').trim() || null
  const kode_barang_lengkap = (formData.get('kode_barang_lengkap') as string || '').trim() || null

  const nama = (formData.get('nama') as string || '').trim()
  const kategori_id = formData.get('kategori_id') as string
  const satuan = (formData.get('satuan') as string || '').trim()
  const stok = parseInt(formData.get('stok') as string || '0', 10)
  const stok_minimum = parseInt(formData.get('stok_minimum') as string || '0', 10)
  const lokasi = (formData.get('lokasi') as string || '').trim() || 'Gudang Persediaan'

  if (!nama || !satuan) {
    return { error: 'Nama barang dan satuan wajib diisi.' }
  }

  if (stok < 0 || stok_minimum < 0) {
    return { error: 'Stok tidak boleh bernilai negatif.' }
  }

  const supabase = await createClient()

  // 1. Insert the new item
  const fullPayload = {
    kd_brng,
    kd_barang,
    kode_barang_lengkap,
    nama,
    kategori_id: kategori_id || null,
    satuan,
    stok,
    stok_minimum,
    lokasi,
  }

  let { data: newBarang, error: barangError } = await supabase
    .from('barang')
    .insert([fullPayload])
    .select()
    .single()

  // Fallback if DB migration hasn't been executed on Supabase yet
  if (barangError && (barangError.message.includes('schema cache') || barangError.message.includes('column'))) {
    const fallbackPayload = {
      nama,
      kategori_id: kategori_id || null,
      satuan,
      stok,
      stok_minimum,
      lokasi,
    }
    const res = await supabase.from('barang').insert([fallbackPayload]).select().single()
    newBarang = res.data
    barangError = res.error
  }

  if (barangError) {
    return { error: barangError.message }
  }

  // 2. Write initial stock history entry if stock > 0
  if (stok > 0 && newBarang) {
    const { error: historyError } = await supabase
      .from('riwayat_stok')
      .insert([
        {
          barang_id: newBarang.id,
          jumlah: stok,
          jenis: 'masuk',
          keterangan: 'Stok awal barang baru',
        },
      ])

    if (historyError) {
      console.error('Failed to write initial stock history:', historyError)
    }
  }

  revalidatePath('/persediaan')
  return { success: true }
}

export async function updateBarang(id: string, prevState: unknown, formData: FormData) {
  const kd_brng = (formData.get('kd_brng') as string || '').trim() || null
  const kd_barang = (formData.get('kd_barang') as string || '').trim() || null
  const kode_barang_lengkap = (formData.get('kode_barang_lengkap') as string || '').trim() || null

  const nama = (formData.get('nama') as string || '').trim()
  const kategori_id = formData.get('kategori_id') as string
  const satuan = (formData.get('satuan') as string || '').trim()
  const stok_minimum = parseInt(formData.get('stok_minimum') as string || '0', 10)
  const lokasi = (formData.get('lokasi') as string || '').trim() || 'Gudang Persediaan'

  if (!nama || !satuan) {
    return { error: 'Nama barang dan satuan wajib diisi.' }
  }

  if (stok_minimum < 0) {
    return { error: 'Stok minimum tidak boleh bernilai negatif.' }
  }

  const supabase = await createClient()

  let { error } = await supabase
    .from('barang')
    .update({
      kd_brng,
      kd_barang,
      kode_barang_lengkap,
      nama,
      kategori_id: kategori_id || null,
      satuan,
      stok_minimum,
      lokasi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Fallback if DB migration hasn't been executed on Supabase yet
  if (error && (error.message.includes('schema cache') || error.message.includes('column'))) {
    const res = await supabase
      .from('barang')
      .update({
        nama,
        kategori_id: kategori_id || null,
        satuan,
        stok_minimum,
        lokasi,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    error = res.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/persediaan')
  revalidatePath(`/persediaan/${id}`)
  return { success: true }
}

export async function getCategories() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('kategori_barang')
    .select('*')
    .order('nama', { ascending: true })

  if (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }

  if (!categories || categories.length === 0) {
    const seed = [
      { nama: 'Alat Tulis Kantor (ATK)' },
      { nama: 'Arsip & Map' },
      { nama: 'Kertas & Catatan' },
      { nama: 'Tinta & Toner' },
      { nama: 'Peralatan Kantor Lainnya' },
    ]
    const { data: seededCategories, error: seedError } = await supabase
      .from('kategori_barang')
      .insert(seed)
      .select()

    if (seedError) {
      console.error('Failed to seed categories:', seedError)
      return []
    }
    return seededCategories || []
  }

  return categories
}

export interface ImportBarangItemInput {
  kd_brng?: string
  kd_barang?: string
  kode_barang_lengkap?: string
  nama: string
  kategori_nama?: string
  satuan: string
  stok: number
  stok_minimum: number
  lokasi?: string
}

export async function importBarangBulk(items: ImportBarangItemInput[]) {
  if (!items || items.length === 0) {
    return { error: 'Daftar barang yang di-import tidak boleh kosong.' }
  }

  const supabase = await createClient()

  // 1. Security Check: verify user is authenticated and is pengelola or admin
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['pengelola', 'admin'].includes(profile.role)) {
    return { error: 'Anda tidak memiliki wewenang untuk menambahkan barang.' }
  }

  // 2. Fetch categories map (name to id)
  const categories = await getCategories()
  const categoryMap = new Map(
    categories.map((c: { id: string; nama: string }) => [c.nama.toLowerCase().trim(), c.id])
  )

  // 3. Format items for insertion
  const barangInserts = items.map((item) => {
    const matchedCategoryId = item.kategori_nama
      ? categoryMap.get(item.kategori_nama.toLowerCase().trim()) || null
      : null

    return {
      kd_brng: item.kd_brng ? item.kd_brng.trim() : null,
      kd_barang: item.kd_barang ? item.kd_barang.trim() : null,
      kode_barang_lengkap: item.kode_barang_lengkap ? item.kode_barang_lengkap.trim() : null,
      nama: item.nama.trim(),
      kategori_id: matchedCategoryId,
      satuan: item.satuan.trim() || 'Pcs',
      stok: Math.max(0, item.stok || 0),
      stok_minimum: Math.max(0, item.stok_minimum || 0),
      lokasi: (item.lokasi && item.lokasi.trim()) ? item.lokasi.trim() : 'Gudang Persediaan',
    }
  })

  // 4. Batch insert into barang table
  let { data: insertedBarang, error: insertError } = await supabase
    .from('barang')
    .insert(barangInserts)
    .select()

  // Fallback if DB migration hasn't been executed on Supabase yet (schema cache error)
  if (insertError && (insertError.message.includes('schema cache') || insertError.message.includes('column'))) {
    const fallbackInserts = barangInserts.map(({ kd_brng, kd_barang, kode_barang_lengkap, ...rest }) => rest)
    const fallbackRes = await supabase.from('barang').insert(fallbackInserts).select()
    insertedBarang = fallbackRes.data
    insertError = fallbackRes.error
  }

  if (insertError || !insertedBarang) {
    return { error: insertError?.message || 'Gagal menyimpan batch barang persediaan.' }
  }

  // 5. Batch insert initial stock logs for items with stok > 0
  const historyInserts = insertedBarang
    .filter((b) => b.stok > 0)
    .map((b) => ({
      barang_id: b.id,
      jumlah: b.stok,
      jenis: 'masuk',
      keterangan: 'Stok awal import Excel',
    }))

  if (historyInserts.length > 0) {
    const { error: historyError } = await supabase
      .from('riwayat_stok')
      .insert(historyInserts)

    if (historyError) {
      console.error('Failed to log stock history for imported items:', historyError)
    }
  }

  revalidatePath('/persediaan')
  revalidatePath('/riwayat')
  return { success: true, count: insertedBarang.length }
}
