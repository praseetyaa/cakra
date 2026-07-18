'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPermintaan(prevState: any, formData: FormData) {
  const unit_kerja = formData.get('unit_kerja') as string
  const keperluan = formData.get('keperluan') as string
  const catatan = formData.get('catatan') as string || ''
  const itemsJson = formData.get('items') as string

  if (!unit_kerja || !keperluan) {
    return { error: 'Unit kerja dan keperluan wajib diisi.' }
  }

  if (!itemsJson) {
    return { error: 'Barang yang diminta tidak boleh kosong.' }
  }

  let items: { barang_id: string; jumlah: number }[] = []
  try {
    items = JSON.parse(itemsJson)
  } catch (e) {
    return { error: 'Format barang tidak valid.' }
  }

  if (items.length === 0) {
    return { error: 'Harap pilih minimal 1 barang.' }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  // 1. Insert permintaan row
  const { data: reqData, error: reqError } = await supabase
    .from('permintaan')
    .insert([
      {
        pemohon_id: user.id,
        unit_kerja,
        keperluan,
        catatan,
        status: 'menunggu',
      },
    ])
    .select()
    .single()

  if (reqError || !reqData) {
    return { error: reqError?.message || 'Gagal menyimpan permintaan.' }
  }

  // 2. Insert permintaan details
  const details = items.map((item) => ({
    permintaan_id: reqData.id,
    barang_id: item.barang_id,
    jumlah: item.jumlah,
  }))

  const { error: detailError } = await supabase
    .from('permintaan_detail')
    .insert(details)

  if (detailError) {
    // Attempt rollback
    await supabase.from('permintaan').delete().eq('id', reqData.id)
    return { error: detailError.message }
  }

  // 3. Send notifications for new request to staff (pengelola, pimpinan, admin)
  const { data: staffProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['pengelola', 'pimpinan', 'admin'])

  if (staffProfiles && staffProfiles.length > 0) {
    const notifications = staffProfiles.map((p) => ({
      user_id: p.id,
      judul: 'Permintaan Baru',
      pesan: `Permintaan ${reqData.nomor || 'Baru'} diajukan oleh Unit ${unit_kerja}`,
      jenis: 'permintaan_baru',
    }))

    const { error: notifError } = await supabase.from('notifikasi').insert(notifications)
    if (notifError) {
      console.error('Failed to insert new request notifications:', notifError)
    }
  }

  revalidatePath('/permintaan')
  return { success: true }
}
