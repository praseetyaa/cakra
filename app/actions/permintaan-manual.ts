'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@/lib/types'

export type ItemInput = { barang_id: string; jumlah: number }

export async function getProfilesWithEmail() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles_with_email')
    .select('*')

  if (error) {
    console.error('Error fetching profiles_with_email:', error)
    return []
  }
  return data || []
}

export async function createPermintaanManual(input: {
  pemohon_id: string | null
  pemohon_nama_manual: string | null
  pemohon_email: string
  unit_kerja: string
  keperluan: string
  catatan: string
  items: ItemInput[]
  daftarkan_provisioning?: boolean
  role_provisioning?: UserRole
}) {
  const supabase = await createClient()

  // 1. Check active user session & role
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userProfile || !['pengelola', 'pimpinan', 'admin'].includes(userProfile.role)) {
    return { error: 'Anda tidak memiliki wewenang untuk melakukan input manual.' }
  }

  if (!input.unit_kerja || !input.keperluan || !input.pemohon_email) {
    return { error: 'Unit kerja, keperluan, dan email pemohon wajib diisi.' }
  }

  if (!input.items || input.items.length === 0) {
    return { error: 'Harap pilih minimal 1 item barang.' }
  }

  // 2. Optional: Upsert to user_provisioning if requested & pemohon_id is null
  if (input.daftarkan_provisioning && !input.pemohon_id && input.pemohon_email) {
    const { error: provError } = await supabase.from('user_provisioning').upsert({
      email: input.pemohon_email,
      nama_lengkap: input.pemohon_nama_manual,
      unit_kerja: input.unit_kerja,
      role: input.role_provisioning || 'pemohon',
    })
    if (provError) {
      console.error('Failed to register user provisioning:', provError)
    }
  }

  // 3. Insert header permintaan
  const { data: permintaan, error: reqError } = await supabase
    .from('permintaan')
    .insert({
      pemohon_id: input.pemohon_id,
      pemohon_email: input.pemohon_email,
      pemohon_nama_manual: input.pemohon_id ? null : input.pemohon_nama_manual,
      unit_kerja: input.unit_kerja,
      keperluan: input.keperluan,
      catatan: input.catatan || '',
      sumber: 'manual_admin',
      diinput_oleh: user.id,
      status: 'menunggu',
    })
    .select()
    .single()

  if (reqError || !permintaan) {
    return { error: reqError?.message || 'Gagal menyimpan permintaan manual.' }
  }

  // 4. Insert details
  const details = input.items.map((item) => ({
    permintaan_id: permintaan.id,
    barang_id: item.barang_id,
    jumlah: item.jumlah,
  }))

  const { error: detailError } = await supabase.from('permintaan_detail').insert(details)
  if (detailError) {
    await supabase.from('permintaan').delete().eq('id', permintaan.id)
    return { error: detailError.message || 'Gagal menyimpan detail item barang.' }
  }

  revalidatePath('/permintaan')
  return { success: true, nomor: permintaan.nomor }
}
