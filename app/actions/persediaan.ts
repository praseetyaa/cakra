'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBarang(prevState: unknown, formData: FormData) {
  const nama = formData.get('nama') as string
  const kategori_id = formData.get('kategori_id') as string
  const satuan = formData.get('satuan') as string
  const stok = parseInt(formData.get('stok') as string || '0', 10)
  const stok_minimum = parseInt(formData.get('stok_minimum') as string || '0', 10)
  const lokasi = formData.get('lokasi') as string || 'Gudang Persediaan'

  if (!nama || !satuan) {
    return { error: 'Nama barang dan satuan wajib diisi.' }
  }

  if (stok < 0 || stok_minimum < 0) {
    return { error: 'Stok tidak boleh bernilai negatif.' }
  }

  const supabase = await createClient()

  // 1. Insert the new item
  const { data: newBarang, error: barangError } = await supabase
    .from('barang')
    .insert([
      {
        nama,
        kategori_id: kategori_id || null,
        satuan,
        stok,
        stok_minimum,
        lokasi,
      },
    ])
    .select()
    .single()

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
      // Log error but don't fail the whole request, since the item is already created
      console.error('Failed to write initial stock history:', historyError)
    }
  }

  revalidatePath('/persediaan')
  return { success: true }
}

export async function updateBarang(id: string, prevState: unknown, formData: FormData) {
  const nama = formData.get('nama') as string
  const kategori_id = formData.get('kategori_id') as string
  const satuan = formData.get('satuan') as string
  const stok_minimum = parseInt(formData.get('stok_minimum') as string || '0', 10)
  const lokasi = formData.get('lokasi') as string || 'Gudang Persediaan'

  if (!nama || !satuan) {
    return { error: 'Nama barang dan satuan wajib diisi.' }
  }

  if (stok_minimum < 0) {
    return { error: 'Stok minimum tidak boleh bernilai negatif.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
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
