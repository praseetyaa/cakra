'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPermintaan(prevState: unknown, formData: FormData) {
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
  } catch {
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

export async function resolvePermintaan(id: string, status: 'disetujui' | 'ditolak') {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['pengelola', 'pimpinan', 'admin'].includes(profile.role)) {
    return { error: 'Anda tidak memiliki wewenang untuk memproses permintaan ini.' }
  }

  // Fetch pemohon_id & nomor BEFORE updating
  const { data: permintaan } = await supabase
    .from('permintaan')
    .select('pemohon_id, nomor')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('permintaan')
    .update({
      status,
      disetujui_oleh: user.id,
    })
    .eq('id', id)

  if (error) {
    if (error.message && error.message.includes('tidak mencukupi')) {
      return { error: error.message }
    }
    return { error: error.message || 'Gagal memproses permintaan. Silakan coba lagi.' }
  }

  // 1. Notify pemohon about the decision
  if (permintaan?.pemohon_id) {
    await supabase.from('notifikasi').insert({
      user_id: permintaan.pemohon_id,
      judul: status === 'disetujui' ? '✅ Permintaan Disetujui' : '❌ Permintaan Ditolak',
      pesan: status === 'disetujui'
        ? `Permintaan ${permintaan.nomor || id} Anda telah disetujui dan sedang diproses oleh pengelola.`
        : `Permintaan ${permintaan.nomor || id} Anda telah ditolak. Silakan hubungi pengelola untuk informasi lebih lanjut.`,
      jenis: status,
    })
  }

  // 2. If approved, check for any items that have fallen to/below stok_minimum
  if (status === 'disetujui') {
    // Get items in this permintaan
    const { data: details } = await supabase
      .from('permintaan_detail')
      .select('barang_id')
      .eq('permintaan_id', id)

    if (details && details.length > 0) {
      const barangIds = details.map((d) => d.barang_id)

      // Fetch current stok for those items
      const { data: barangList } = await supabase
        .from('barang')
        .select('id, nama, stok, stok_minimum')
        .in('id', barangIds)

      const menipis = (barangList || []).filter(
        (b) => b.stok_minimum > 0 && b.stok <= b.stok_minimum
      )

      if (menipis.length > 0) {
        // Get staff IDs (pengelola, pimpinan, admin)
        const { data: staffProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['pengelola', 'pimpinan', 'admin'])

        if (staffProfiles && staffProfiles.length > 0) {
          const stokNotifs = staffProfiles.flatMap((p) =>
            menipis.map((b) => ({
              user_id: p.id,
              judul: '⚠️ Stok Barang Menipis',
              pesan: `Stok ${b.nama} tersisa ${b.stok} (minimum: ${b.stok_minimum}). Segera lakukan pengadaan.`,
              jenis: 'stok_menipis' as const,
            }))
          )
          const { error: stokNotifError } = await supabase.from('notifikasi').insert(stokNotifs)
          if (stokNotifError) {
            console.error('Failed to insert stok_menipis notifications:', stokNotifError)
          }
        }
      }
    }
  }

  revalidatePath('/permintaan')
  revalidatePath(`/permintaan/${id}`)
  return { success: true }
}

