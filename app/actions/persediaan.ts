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
  const fullPayload: Record<string, unknown> = {
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

export async function deleteBarang(id: string) {
  const supabase = await createClient()

  // 1. Delete associated stock logs
  await supabase.from('riwayat_stok').delete().eq('barang_id', id)

  // 2. Delete item from barang table
  const { error } = await supabase.from('barang').delete().eq('id', id)
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/persediaan')
  revalidatePath('/riwayat')
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

  // 1. Security Check
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

  // 3. Fetch existing barang items in DB for de-duplication (Upsert)
  const { data: existingBarangList } = await supabase
    .from('barang')
    .select('*')

  const existingByKode = new Map<string, Record<string, unknown>>()
  const existingByNama = new Map<string, Record<string, unknown>>()

  if (existingBarangList) {
    existingBarangList.forEach((b: Record<string, unknown>) => {
      if (b.kode_barang_lengkap) {
        existingByKode.set(String(b.kode_barang_lengkap).toLowerCase().trim(), b)
      }
      if (b.nama) {
        existingByNama.set(String(b.nama).toLowerCase().trim(), b)
      }
    })
  }

  // 4. Process each item: UPDATE if existing, INSERT if new
  let processedCount = 0
  const historyInserts: Record<string, unknown>[] = []

  for (const item of items) {
    const namaTrim = item.nama.trim()
    const kodeTrim = item.kode_barang_lengkap ? item.kode_barang_lengkap.trim() : null
    const matchedCategoryId = item.kategori_nama
      ? categoryMap.get(item.kategori_nama.toLowerCase().trim()) || null
      : null

    // Check if item already exists by kode_barang_lengkap or by nama
    const existing = (kodeTrim && existingByKode.get(kodeTrim.toLowerCase())) || existingByNama.get(namaTrim.toLowerCase())

    if (existing) {
      // UPDATE existing item
      const updateData: Record<string, unknown> = {
        nama: namaTrim,
        satuan: item.satuan.trim() || String(existing.satuan || 'Pcs'),
        stok_minimum: Math.max(0, item.stok_minimum ?? Number(existing.stok_minimum || 0)),
        lokasi: (item.lokasi && item.lokasi.trim()) ? item.lokasi.trim() : String(existing.lokasi || 'Gudang Persediaan'),
        updated_at: new Date().toISOString(),
      }

      if (matchedCategoryId) updateData.kategori_id = matchedCategoryId
      if (item.kd_brng) updateData.kd_brng = item.kd_brng.trim()
      if (item.kd_barang) updateData.kd_barang = item.kd_barang.trim()
      if (kodeTrim) updateData.kode_barang_lengkap = kodeTrim

      // If stock in Excel is > 0 and differs from DB, update stock and write audit log
      const existingStok = Number(existing.stok || 0)
      if (item.stok > 0 && item.stok !== existingStok) {
        updateData.stok = Math.max(0, item.stok)

        historyInserts.push({
          barang_id: existing.id,
          jumlah: item.stok,
          jenis: 'penyesuaian',
          keterangan: 'Pembaruan stok dari Import Excel',
        })
      }

      let { error: updateError } = await supabase
        .from('barang')
        .update(updateData)
        .eq('id', existing.id)

      if (updateError && (updateError.message.includes('schema cache') || updateError.message.includes('column'))) {
        delete updateData.kd_brng
        delete updateData.kd_barang
        delete updateData.kode_barang_lengkap
        await supabase.from('barang').update(updateData).eq('id', existing.id)
      }

      processedCount++
    } else {
      // INSERT new item
      const newPayload: Record<string, unknown> = {
        kd_brng: item.kd_brng ? item.kd_brng.trim() : null,
        kd_barang: item.kd_barang ? item.kd_barang.trim() : null,
        kode_barang_lengkap: kodeTrim,
        nama: namaTrim,
        kategori_id: matchedCategoryId,
        satuan: item.satuan.trim() || 'Pcs',
        stok: Math.max(0, item.stok || 0),
        stok_minimum: Math.max(0, item.stok_minimum || 0),
        lokasi: (item.lokasi && item.lokasi.trim()) ? item.lokasi.trim() : 'Gudang Persediaan',
      }

      let { data: newBarang, error: insertError } = await supabase
        .from('barang')
        .insert([newPayload])
        .select()
        .single()

      if (insertError && (insertError.message.includes('schema cache') || insertError.message.includes('column'))) {
        delete newPayload.kd_brng
        delete newPayload.kd_barang
        delete newPayload.kode_barang_lengkap
        const fallbackRes = await supabase.from('barang').insert([newPayload]).select().single()
        newBarang = fallbackRes.data
      }

      if (newBarang && item.stok > 0) {
        historyInserts.push({
          barang_id: newBarang.id,
          jumlah: item.stok,
          jenis: 'masuk',
          keterangan: 'Stok awal import Excel',
        })
      }

      processedCount++
    }
  }

  // 5. Batch insert history logs if any
  if (historyInserts.length > 0) {
    await supabase.from('riwayat_stok').insert(historyInserts)
  }

  revalidatePath('/persediaan')
  revalidatePath('/riwayat')
  return { success: true, count: processedCount }
}

export async function createCategory(nama: string) {
  if (!nama || !nama.trim()) {
    return { error: 'Nama kategori tidak boleh kosong.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kategori_barang')
    .insert([{ nama: nama.trim() }])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/persediaan')
  return { success: true, category: data }
}

export async function updateCategory(id: string, nama: string) {
  if (!nama || !nama.trim()) {
    return { error: 'Nama kategori tidak boleh kosong.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('kategori_barang')
    .update({ nama: nama.trim() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/persediaan')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  // 1. Unassign items using this category safely (set kategori_id to null)
  await supabase
    .from('barang')
    .update({ kategori_id: null })
    .eq('kategori_id', id)

  // 2. Delete the category
  const { error } = await supabase
    .from('kategori_barang')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/persediaan')
  return { success: true }
}
